package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
	lo "github.com/samber/lo"
)

func ConfigItems() [][2]string {
	const KEY_PREFIX = "app-configuration-sync"
	const KEY_SEPARATOR = ":"

	k := func(key ...string) string {
		return KEY_PREFIX + KEY_SEPARATOR + strings.Join(key, KEY_SEPARATOR)
	}

	c := make([][2]string, 0)

	c = append(c, [2]string{k("key1"), "value10"})
	c = append(c, [2]string{k("key2"), "value222"})
	c = append(c, [2]string{k("key3"), "value3"})
	c = append(c, [2]string{k("key4"), "value44"})

	return c
}

type Configuration interface {
	GetConfigurationItem(key string) (string, bool, error)
	SetConfigurationItem(key string, value string) error
	DeleteConfigurationItem(key string) error
}

type RemoteConfiguration struct {
	ctx          context.Context
	redis_client *redis.Client
}

func NewRemoteConfiguration(ctx context.Context, redis_client *redis.Client) *RemoteConfiguration {
	return &RemoteConfiguration{ctx: ctx, redis_client: redis_client}
}

func (rc *RemoteConfiguration) GetConfigurationItem(key string) (string, bool, error) {
	val, err := rc.redis_client.Get(rc.ctx, key).Result()

	// Key doesn't exist
	if err == redis.Nil {
		return "", false, nil
	}

	if err != nil {
		return "", false, err
	}

	return val, true, nil
}

func (rc *RemoteConfiguration) SetConfigurationItem(key string, value string) error {
	return rc.redis_client.Set(rc.ctx, key, value, 0).Err()
}

func (rc *RemoteConfiguration) DeleteConfigurationItem(key string) error {
	return rc.redis_client.Del(rc.ctx, key).Err()
}

type RemoteConfigurationDryRun struct {
	RemoteConfiguration
}

func NewRemoteConfigurationDryRun(ctx context.Context, redis_client *redis.Client) *RemoteConfigurationDryRun {
	return &RemoteConfigurationDryRun{RemoteConfiguration{ctx: ctx, redis_client: redis_client}}
}

func (rc *RemoteConfigurationDryRun) SetConfigurationItem(key string, value string) error {
	return nil
}

func (rc *RemoteConfigurationDryRun) DeleteConfigurationItem(key string) error {
	return nil
}

type ConfigurationState struct {
	Version int      `json:"version"`
	Keys    []string `json:"keys"`
}

func NewConfigurationState(version int, keys []string) *ConfigurationState {
	return &ConfigurationState{Version: version, Keys: keys}
}

func DeleteElementFromSliceWithoutPreservingOrder[T any](slice []T, index int) []T {
	slice[index] = slice[len(slice)-1]
	return slice[:len(slice)-1]
}

func main() {
	// CLI Arguments
	redis_address := flag.String("redis-address", "localhost:6379", "address of redis server")
	redis_password := flag.String("redis-password", "", "password of redis server")
	redis_db := flag.Int("redis-db", 0, "db of redis server")
	configuration_state_key := flag.String("configuration-state-key", "app-configuration-sync:__state__", "key containing the state for the configuration")
	dry_run := flag.Bool("dry-run", false, "dry run mode")
	flag.Parse()

	fmt.Printf("Starting app-configuration-sync\n")
	fmt.Printf("Redis Address: %s\n", *redis_address)
	if *dry_run {
		fmt.Printf("Dry Run Mode\n")
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     *redis_address,
		Password: *redis_password, // no password set
		DB:       *redis_db,       // use default DB
	})
	defer rdb.Close()

	var configuration Configuration
	if *dry_run {
		configuration = NewRemoteConfigurationDryRun(context.Background(), rdb)
	} else {
		configuration = NewRemoteConfiguration(context.Background(), rdb)
	}

	fmt.Println("")

	fmt.Println("Loading configuration state")

	var config_state *ConfigurationState
	config_state_str, exist := lo.Must2(configuration.GetConfigurationItem(*configuration_state_key))

	if !exist {
		fmt.Println("Configuration state not found, creating a new one")
		config_state = NewConfigurationState(1, []string{})
	} else {
		fmt.Println("Configuration state found")
		lo.Must0(json.Unmarshal([]byte(config_state_str), &config_state))
	}

	fmt.Println("")

	new_config_items := ConfigItems()

	for _, item := range new_config_items {
		new_config_item_key, new_config_item_value := item[0], item[1]

		current_value, current_value_exists := lo.Must2(configuration.GetConfigurationItem(new_config_item_key))

		exists_in_state := lo.Contains(config_state.Keys, new_config_item_key)

		if !current_value_exists && exists_in_state {
			panic(fmt.Errorf("Configuration state or key value pair out of sync, \"%s\" is in the state but not found in the configuration", new_config_item_key))
		}

		if current_value_exists && !exists_in_state {
			panic(fmt.Errorf("Configuration state or key value pair out of sync, \"%s\" is in the configuration but not found in the state", new_config_item_key))
		}

		if !current_value_exists {
			fmt.Printf("Configuration \"%s\" is new, creating it\n", new_config_item_key)
			lo.Must0(configuration.SetConfigurationItem(new_config_item_key, new_config_item_value))
			config_state.Keys = append(config_state.Keys, new_config_item_key)
			continue
		}

		if current_value == new_config_item_value {
			fmt.Printf("Configuration \"%s\" has not changed\n", new_config_item_key)
			continue
		}

		fmt.Printf("Configuration \"%s\" has changed, updating it\n", new_config_item_key)
		lo.Must0(configuration.SetConfigurationItem(new_config_item_key, new_config_item_value))
	}

	new_config_items_keys := lo.Map(new_config_items, func(item [2]string, _ int) string { return item[0] })
	state_key_indexes_to_delete, _ := lo.Difference(config_state.Keys, new_config_items_keys)

	for _, k := range state_key_indexes_to_delete {
		fmt.Printf("Configuration \"%s\" has been removed, deleting it\n", k)
		lo.Must0(configuration.DeleteConfigurationItem(k))
	}

	new_state_keys := lo.Filter(config_state.Keys, func(key string, _ int) bool { return !lo.Contains(state_key_indexes_to_delete, key) })
	config_state.Keys = new_state_keys

	fmt.Println("")

	fmt.Println("Saving configuration state")

	new_state_str := lo.Must1(json.Marshal(config_state))
	lo.Must0(configuration.SetConfigurationItem(*configuration_state_key, string(new_state_str)))

	fmt.Println("Configuration state saved")

	fmt.Println("")

	fmt.Println("app-configuration-sync finished successfully")
}
