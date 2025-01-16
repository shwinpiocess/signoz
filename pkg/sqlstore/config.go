package sqlstore

import (
	"errors"
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use.
	Provider string `mapstructure:"provider"`
	// Connection is the connection configuration.
	Connection ConnectionConfig `mapstructure:",squash"`
	// Migration is the migration configuration.
	Migration MigrationConfig `mapstructure:"migration"`
	// Sqlite is the sqlite configuration.
	Sqlite SqliteConfig `mapstructure:"sqlite"`
}

type SqliteConfig struct {
	// Path is the path to the sqlite database.
	Path string `mapstructure:"path"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`
}

type MigrationConfig struct {
	// LockTimeout is the time to wait for the migration lock.
	LockTimeout time.Duration `mapstructure:"lock_timeout"`
	// LockInterval is the interval to try to acquire the migration lock.
	LockInterval time.Duration `mapstructure:"lock_interval"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlstore"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: "sqlite",
		Connection: ConnectionConfig{
			MaxOpenConns: 100,
		},
		Migration: MigrationConfig{
			LockTimeout:  2 * time.Minute,
			LockInterval: 10 * time.Second,
		},
		Sqlite: SqliteConfig{
			Path: "/var/lib/signoz/signoz.db",
		},
	}

}

func (c Config) Validate() error {
	if c.Migration.LockTimeout < c.Migration.LockInterval {
		return errors.New("lock_timeout must be greater than lock_interval")
	}

	return nil
}
