package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type addIntegrations struct {
	config sqlstore.MigrationConfig
}

func NewAddIntegrationsMigrationFactory() sqlstore.MigrationFactory {
	return sqlstore.NewMigrationFactory(newAddIntegrations)
}

func newAddIntegrations(config sqlstore.MigrationConfig) sqlstore.Migration {
	return &addIntegrations{config: config}
}

func (migration *addIntegrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS integrations_installed(
		integration_id TEXT PRIMARY KEY,
		config_json TEXT,
		installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS cloud_integrations_accounts(
		cloud_provider TEXT NOT NULL,
		id TEXT NOT NULL,
		config_json TEXT,
		cloud_account_id TEXT,
		last_agent_report_json TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
		removed_at TIMESTAMP,
		UNIQUE(cloud_provider, id)
	)`); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
