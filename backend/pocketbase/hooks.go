package main

import (
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// Build Roadmap Step 6 (gamification hardening) / Section 6's anti-cheat
// note: "since hearts/streak/XP determine progression, validate and adjust
// these server-side rather than trusting client-submitted values outright."
// Step 4/5 built the sync queue and ownership rules; this is what actually
// checks the numbers a client submits are plausible, not just that the
// client is allowed to submit *something* to its own record.
//
// XPPerCorrect mirrors mobile/src/constants/gameBalance.ts's
// XP_PER_CORRECT. Content (and therefore exact per-room question counts)
// stays client-only per Section 4, so this file can't know precisely how
// much XP a given room *should* award — MaxPlausibleRoomXP is a generous
// safety ceiling instead of an exact simulation, comfortably above today's
// 8-question rooms without being fragile to that number changing. These
// two constants are deliberately duplicated from the mobile app rather
// than shared across the Go/TypeScript boundary; keep them in sync by
// hand if gameBalance.ts changes.
const (
	xpPerCorrect        = 15
	maxQuestionsPerRoom = 40 // generous ceiling, not the real per-era count (currently 8)
	maxPlausibleRoomXP  = xpPerCorrect * maxQuestionsPerRoom
	maxEraIndex         = 5 // six eras (Section 1/2), zero-indexed — this bound IS exact, unlike question counts
	maxHearts           = 3 // Section 6: "hearts start at 3 per room attempt"
	maxPlausibleStreak  = 3650 // ~10 years — a sanity ceiling, not a real product limit
)

func isFutureDate(record *core.Record, field string) bool {
	v := record.GetDateTime(field)
	return !v.IsZero() && v.Time().After(time.Now().Add(24*time.Hour))
	// the +24h slack tolerates reasonable client/server clock drift rather
	// than rejecting on any sub-second skew
}

func registerHardeningHooks(app core.App) {
	app.OnRecordCreateRequest("player").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		r := e.Record
		switch {
		case r.GetInt("xp") < 0 || r.GetInt("xp")%xpPerCorrect != 0:
			return e.BadRequestError("xp must be a non-negative multiple of the per-question XP award.", nil)
		case r.GetInt("streak") < 0 || r.GetInt("streak") > 1:
			return e.BadRequestError("A brand new player can't start with a streak above 1.", nil)
		case r.GetInt("unlocked_era_index") < 0 || r.GetInt("unlocked_era_index") > maxEraIndex:
			return e.BadRequestError("unlocked_era_index out of range.", nil)
		case r.GetInt("hearts") < 0 || r.GetInt("hearts") > maxHearts:
			return e.BadRequestError("hearts out of range.", nil)
		case isFutureDate(r, "last_active_date"):
			return e.BadRequestError("last_active_date can't be in the future.", nil)
		}

		return e.Next()
	})

	app.OnRecordUpdateRequest("player").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		r := e.Record
		original := r.Original()

		newXP, oldXP := r.GetInt("xp"), original.GetInt("xp")
		newStreak, oldStreak := r.GetInt("streak"), original.GetInt("streak")
		newUnlocked, oldUnlocked := r.GetInt("unlocked_era_index"), original.GetInt("unlocked_era_index")

		xpGained := newXP - oldXP
		eraAdvance := newUnlocked - oldUnlocked

		switch {
		case newXP < oldXP:
			return e.BadRequestError("xp can't decrease.", nil)
		case xpGained%xpPerCorrect != 0:
			return e.BadRequestError("xp must increase in whole per-question increments.", nil)
		case xpGained > maxPlausibleRoomXP:
			return e.BadRequestError("xp increased by an implausible amount in one update.", nil)
		case newStreak < oldStreak && newStreak != 1:
			// Section 6: increments once per calendar day, or resets to 1 on
			// a missed day. Deliberately NOT capped at "+1 per update": a
			// device that was offline across several calendar days and
			// syncs once on reconnect legitimately jumps by more than 1 in
			// a single request (computeStreakUpdate() already resolved the
			// correct day-by-day value locally before this sync).
			return e.BadRequestError("streak can only increase, or reset to 1.", nil)
		case newStreak > maxPlausibleStreak:
			return e.BadRequestError("streak out of plausible range.", nil)
		case newUnlocked < oldUnlocked:
			return e.BadRequestError("unlocked_era_index can't decrease.", nil)
		case newUnlocked > maxEraIndex:
			return e.BadRequestError("unlocked_era_index out of range.", nil)
		case eraAdvance*xpPerCorrect > xpGained:
			// Same reasoning as streak above: a device catching up after
			// being offline across multiple room completions can
			// legitimately unlock more than one era in a single sync, as
			// long as it also shows the xp those completions would have
			// earned. This is what actually blocks the cheat (patch
			// unlocked_era_index straight to its max with no xp to show for
			// it) without also blocking legitimate offline catch-up.
			return e.BadRequestError("unlocked_era_index advanced without enough xp gain to justify it.", nil)
		case isFutureDate(r, "last_active_date"):
			return e.BadRequestError("last_active_date can't be in the future.", nil)
		case r.GetBool("premium") != original.GetBool("premium"):
			// Section 8: premium gating is deferred and nothing checks this
			// field yet, but only a superuser (future IAP-receipt
			// validation, still Step 8+) should ever be the one flipping it.
			return e.BadRequestError("premium can't be changed by the record owner.", nil)
		}

		return e.Next()
	})

	app.OnRecordCreateRequest("player_progress").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		if score := e.Record.GetInt("best_score"); score < 0 || score > maxQuestionsPerRoom {
			return e.BadRequestError("best_score out of range.", nil)
		}

		return e.Next()
	})

	app.OnRecordUpdateRequest("player_progress").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		newScore := e.Record.GetInt("best_score")
		oldScore := e.Record.Original().GetInt("best_score")

		switch {
		case newScore < oldScore:
			return e.BadRequestError("best_score can't decrease.", nil)
		case newScore > maxQuestionsPerRoom:
			return e.BadRequestError("best_score out of range.", nil)
		}

		return e.Next()
	})
}
