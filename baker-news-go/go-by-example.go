package main

import (
	"fmt"
	"io"
	"iter"
	"log/slog"
	"net/http"
	"os"
	"slices"
	"time"
	"unicode/utf8"
)

type driver interface {
	canDrive() bool
}

type person struct {
	name string
	age  int
}

func (p *person) canDrive() bool {
	return p.age >= 18
}

type dog struct {
	name string
}

func (d dog) canDrive() bool {
	return false
}

// ENUM
type Specie int

const (
	Human Specie = iota
	Dog
	Cat
)

func (s Specie) String() string {
	return [...]string{"Human", "Dog", "Cat"}[s]
}

func main() {
	var x int = 23

	fmt.Println("Hello, World!"+" boo", 546, x)

	x = x + 123
	fmt.Println("x", x)

	y := 100
	y = y + 100
	fmt.Println("y", y)

	const foo = 999

	fmt.Println("foo", foo+1)

	for i := range 3 {
		fmt.Println("range 3", i)
	}

	if x > 100 {
		fmt.Println("x > 100")
	} else {
		fmt.Println("x <= 100")
	}

	var arr = [...]int{1, 2}
	fmt.Println("arr", arr)
	for i := range arr {
		fmt.Println("arr", arr[i])
	}

	var slice = make([]string, 4)
	slice[1] = "hello"
	fmt.Println("slice", slice)

	m := make(map[string]float32)
	m["foo"] = 1.23
	m["pi"] = 3.14
	fmt.Println("map", m)
	k, v := m["foo"]
	fmt.Println("map's k v", k, v)

	square := func(x int) int {
		return x * x
	}
	fmt.Println("square(3)", square(3))

	sum := func(nums ...int) int {
		total := 0
		for _, num := range nums {
			total += num
		}
		return total
	}
	fmt.Println("sum(1, 2, 3)", sum(1, 2, 3))

	for i, c := range "go" {
		fmt.Println("range go", i, c)
	}

	const s = "Viní"
	fmt.Println("len(s)", s, len(s))
	fmt.Println("utf8.RuneCountInString(s)", s, utf8.RuneCountInString(s))

	p := person{name: "Bob", age: 20}
	fmt.Println("p", p)

	animal := struct {
		name   string
		specie string
	}{
		name:   "dog",
		specie: "mammal",
	}
	fmt.Println("animal", animal)
	fmt.Println("animal.name", animal.name)

	fmt.Println("p.canDrive()", p, p.canDrive())

	var d driver = &p
	fmt.Println("d", d)

	var d2 driver = dog{name: "Rex"}
	fmt.Println("d2", d2)

	fmt.Println("Human", Human)

	// ANONYMOUS STRUCT
	user := struct {
		person
		specie Specie
	}{
		person: person{name: "Rex", age: 3},
		specie: Dog,
	}
	fmt.Println("user", user)

	// ITERATOR / GENERATOR
	var foobarger = func() iter.Seq[string] {
		return func(yield func(string) bool) {
			yield("foo")
			yield("bar")
		}
	}

	for i := range foobarger() {
		fmt.Println("foobarger", i)
	}

	var fbg = func(yield func(string) bool) {
		yield("foo")
		yield("bar")
	}

	for i := range fbg {
		fmt.Println("fbg", i)
	}

	// GO ROUTINE
	go func() {
		fmt.Println("go routine")
	}()

	time.Sleep(1 * time.Millisecond)

	// CHANNEL
	ch_basic := make(chan string)
	go func() {
		fmt.Println("start ch1 sending Ola")
		ch_basic <- "Ola"
		fmt.Println("ch1 sent Ola")
		// time.Sleep(1000 * time.Millisecond)
		ch_basic <- "hello"
		fmt.Println("ch1 sent Hello")
	}()
	// time.Sleep(1000 * time.Millisecond)
	fmt.Println("ch1", <-ch_basic)
	fmt.Println("ch1 middle")
	fmt.Println("ch1", <-ch_basic)
	time.Sleep(10 * time.Millisecond)

	// CHANNEL BUFFER
	ch_buffer := make(chan string, 4)
	ch_buffer <- "1"
	ch_buffer <- "2"

	fmt.Println("ch_buffer", <-ch_buffer)
	fmt.Println("ch_buffer", <-ch_buffer)

	// CHANNEL AS PARAMETERS
	ch_param_in := make(chan string)
	ch_param_out := make(chan string)

	go func(in <-chan string, out chan<- string) {
		for {
			tmp := <-in
			out <- tmp
		}
	}(ch_param_in, ch_param_out)

	ch_param_in <- "1"
	fmt.Println("ch_param", <-ch_param_out)

	ch_param_in <- "2"
	fmt.Println("ch_param", <-ch_param_out)

	// SELECT / TIMEOUT
	ch_timeout := make(chan string)

	go func() {
		time.Sleep(1 * time.Second)
		ch_timeout <- "foo"
	}()

	select {
	case msg := <-ch_timeout:
		fmt.Println("ch_timeout", msg)
	case <-time.After(2 * time.Millisecond):
		fmt.Println("ch_timeout timeout")
	}

	// SORTING
	var arr_sort = []int{3, 1, 2}
	slices.Sort(arr_sort)
	fmt.Println("arr_sort", arr_sort)

	// LOGGING
	jsonHandler := slog.NewJSONHandler(os.Stderr, nil)
	logger := slog.New(jsonHandler)
	logger.Info("Hello, World!", "foo", "bar")

	// HTTP CLIENT
	resp, err := http.Get("http://localhost:8090/hello")
	if err != nil {
		logger.Error("http.Get", "error message", err.Error())
	} else {
		body, _ := io.ReadAll(resp.Body)

		logger.Info("http.Get", "status", resp.Status, "body", string(body))
	}

	// ENVIRONMENT VARIABLES
	fmt.Println("os.Getenv(\"HOME\")", os.Getenv("HOME"))
}
