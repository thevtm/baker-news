package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	lo "github.com/samber/lo"
)

const VERSION = "0.1.0"

const DB_NAME = "baker_news"

////////////////////////////////////////
/////////// Command Pattern ////////////
////////////////////////////////////////

type Command interface {
	Execute() error
}

/// Create Database If Absent Command //

type CreateDatabaseIfAbsentCommand struct {
	DatabaseURI  string
	DatabaseName string
}

func NewCreateDatabaseIfAbsentCommand(DatabaseURI string, DatabaseName string) Command {
	return CreateDatabaseIfAbsentCommand{DatabaseURI: DatabaseURI, DatabaseName: DatabaseName}
}

func (c CreateDatabaseIfAbsentCommand) Execute() error {
	fmt.Printf("Creating database \"%s\" if it does not exists...\n", DB_NAME)

	// 1. Connect to the database
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, c.DatabaseURI)
	if err != nil {
		return err
	}

	// 2. Check if the database exists
	db_exists, err := QueryDatabaseExists(ctx, conn, c.DatabaseName)

	if err != nil {
		return err
	}

	if db_exists {
		fmt.Printf("Database \"%s\" already exists\n", c.DatabaseName)
		return nil
	}

	// 3. Database is absent, create it
	fmt.Printf("Database \"%s\" does not exists, creating it...\n", c.DatabaseName)

	err = QueryDatabaseCreate(ctx, conn, c.DatabaseName)

	if err != nil {
		return err
	}

	fmt.Printf("Database \"%s\" created successfully\n", c.DatabaseName)

	return nil
}

///////////// Drop Command /////////////

type DropCommand struct {
	DatabaseURI  string
	DatabaseName string
}

func NewDropCommand(DatabaseURI string, DatabaseName string) Command {
	return DropCommand{DatabaseURI: DatabaseURI, DatabaseName: DatabaseName}
}

func (c DropCommand) Execute() error {
	fmt.Printf("Dropping database \"%s\" if it exists...\n", DB_NAME)

	// 1. Connect to the database
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, c.DatabaseURI)
	if err != nil {
		return err
	}

	// 2. Check if the database exists
	db_exists, err := QueryDatabaseExists(ctx, conn, c.DatabaseName)

	if err != nil {
		return err
	}

	if !db_exists {
		fmt.Printf("Database \"%s\" does not exist\n", c.DatabaseName)
		return nil
	}

	// 3. Database is absent, create it
	fmt.Printf("Database \"%s\" exists, dropping it...\n", c.DatabaseName)

	err = QueryDatabaseDrop(ctx, conn, c.DatabaseName)

	if err != nil {
		return err
	}

	fmt.Printf("Database \"%s\" dropped successfully\n", c.DatabaseName)

	return nil
}

////////////////////////////////////////
///////////// SQL Queries //////////////
////////////////////////////////////////

func QueryDatabaseExists(ctx context.Context, conn *pgx.Conn, db_name string) (bool, error) {
	const QUERY_DATABASE_EXISTS_SQL = `
	SELECT EXISTS (
		SELECT FROM pg_database WHERE datname = $1
	);
	`

	db_exists_row := conn.QueryRow(ctx, QUERY_DATABASE_EXISTS_SQL, db_name)

	db_exists := false
	err := db_exists_row.Scan(&db_exists)

	if err != nil {
		return false, err
	}

	return db_exists, nil
}

func QueryDatabaseCreate(ctx context.Context, conn *pgx.Conn, db_name string) error {
	const CREATE_DATABASE_SQL = `
	CREATE DATABASE %s;
	`

	query := fmt.Sprintf(CREATE_DATABASE_SQL, db_name)
	_, err := conn.Exec(ctx, query)

	return err
}

func QueryDatabaseDrop(ctx context.Context, conn *pgx.Conn, db_name string) error {
	const DROP_DATABASE_SQL = `
	DROP DATABASE %s;
	`

	query := fmt.Sprintf(DROP_DATABASE_SQL, db_name)
	_, err := conn.Exec(ctx, query)

	return err
}

////////////////////////////////////////
///////////// Main Function ////////////
////////////////////////////////////////

func ParseArguments() (Command, error) {
	const createDatabaseIfAbsentCmdName = "create-database-if-absent"
	const dropDatabaseIfExistsCmdName = "drop-database-if-exists"

	createIfAbsentCmd := flag.NewFlagSet(createDatabaseIfAbsentCmdName, flag.ExitOnError)
	dropIfExistsCmd := flag.NewFlagSet(dropDatabaseIfExistsCmdName, flag.ExitOnError)

	if len(os.Args) < 2 {
		return nil, fmt.Errorf("expected '%s' or '%s' subcommands", createDatabaseIfAbsentCmdName, dropDatabaseIfExistsCmdName)
	}

	db_url, ok := os.LookupEnv("DATABASE_URI")
	if !ok {
		return nil, fmt.Errorf("DATABASE_URI not set")
	}

	switch strings.ToLower(os.Args[1]) {
	case createDatabaseIfAbsentCmdName:
		createIfAbsentCmd.Parse(os.Args[2:])
		return NewCreateDatabaseIfAbsentCommand(db_url, DB_NAME), nil
	case dropDatabaseIfExistsCmdName:
		dropIfExistsCmd.Parse(os.Args[2:])
		return NewDropCommand(db_url, DB_NAME), nil
	default:
		return nil, fmt.Errorf("expected '%s' or '%s' subcommands", createDatabaseIfAbsentCmdName, dropDatabaseIfExistsCmdName)
	}
}

func main() {
	fmt.Printf("Database Utils v%s\n\n", VERSION)

	cmd := lo.Must(ParseArguments())
	lo.Must0(cmd.Execute())

	fmt.Println("\nDatabase Utils completed successfully")
}
