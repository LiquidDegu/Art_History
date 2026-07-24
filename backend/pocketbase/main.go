// Self-hosted backend (Build Roadmap Step 4). Schema lives in
// pb_migrations/ (JS, applied automatically on boot via migratecmd), no
// custom Go hooks yet. See README.md for how this is built/run and why
// it's compiled from source rather than downloading a prebuilt release
// binary.
package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	app := pocketbase.New()

	// Loads pb_hooks/*.js (Step 6 will add server-side gamification
	// validation here) and makes the JS migration API (`migrate(...)`,
	// `new Collection(...)`) available to pb_migrations/*.js.
	jsvm.MustRegister(app, jsvm.Config{
		MigrationsDir: "pb_migrations",
		HooksDir:      "pb_hooks",
	})

	// Applies pb_migrations/*.js automatically on every boot (Automigrate),
	// so `docker compose up` alone is enough to get a fully-schema'd
	// database — no separate migration-running step.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
		Dir:         "pb_migrations",
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
