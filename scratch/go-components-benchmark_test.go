// $ go test -v --benchmem --bench . ./scratch/go-components-benchmark_test.go
// === RUN   TestStatic
// --- PASS: TestStatic (0.00s)
// goos: linux
// goarch: amd64
// cpu: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
// BenchmarkStaticGC
// BenchmarkStaticGC-12           	 3509049	       328.2 ns/op	     104 B/op	       7 allocs/op
// BenchmarkStaticGCNode
// BenchmarkStaticGCNode-12       	 5702686	       208.7 ns/op	      40 B/op	       4 allocs/op
// BenchmarkStaticGCNodeRaw
// BenchmarkStaticGCNodeRaw-12    	31493150	        38.95 ns/op	      24 B/op	       1 allocs/op
// BenchmarkStaticPrintf
// BenchmarkStaticPrintf-12       	26211787	        39.53 ns/op	       0 B/op	       0 allocs/op
// PASS
// ok  	command-line-arguments	5.258s

package main

import (
	"bytes"
	"fmt"
	"testing"

	gc "maragu.dev/gomponents"
	h "maragu.dev/gomponents/html"
)

func StaticSmall() gc.Node {
	return h.H1(gc.Text("Hello, World!"))
}

func BenchmarkStaticSmall(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		StaticSmall().Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticSmallToRaw(b *testing.B) {
	node := StaticSmall()

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func() gc.Node {
		return gc.Raw(fmt.Sprint(raw_str))
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component().Render(buf)
		buf.Reset()
	}
}

func DynamicSmall(s string) gc.Node {
	return h.H1(gc.Text(s))
}

func BenchmarkDynamicSmall(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		DynamicSmall("foobar").Render(buf)
		buf.Reset()
	}
}

func BenchmarkDynamicSmallToRaw(b *testing.B) {
	node := DynamicSmall("%s")

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func(s string) gc.Node {
		return gc.Raw(fmt.Sprintf(raw_str, s))
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component("foobar").Render(buf)
		buf.Reset()
	}
}

func StaticLarge() gc.Node {
	lis := make(gc.Group, 1000)

	for i := 0; i < 1000; i++ {
		lis[i] = h.Li(gc.Textf("Item %d", i))
	}

	return h.HTML(
		h.Head(
			h.Meta(gc.Attr("charset", "UTF-8")),
			h.Title("Hello, World!"),
		),
		h.Body(
			h.H1(gc.Text("Hello, World!")),
			h.P(gc.Text("This is a paragraph")),
			h.A(gc.Text("Click me"), gc.Attr("href", "/")),
			h.Ul(lis),
		),
	)
}

func BenchmarkStaticLarge(b *testing.B) {
	buf := new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		StaticLarge().Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticLargeCache(b *testing.B) {
	buf := new(bytes.Buffer)
	node := StaticLarge()

	for i := 0; i < b.N; i++ {
		node.Render(buf)
		buf.Reset()
	}
}

func BenchmarkStaticLargeToRaw(b *testing.B) {
	node := StaticLarge()

	buf := new(bytes.Buffer)
	node.Render(buf)
	raw_str := buf.String()

	component := func() gc.Node {
		return gc.Raw(fmt.Sprint(raw_str))
	}

	buf = new(bytes.Buffer)

	for i := 0; i < b.N; i++ {
		component().Render(buf)
		buf.Reset()
	}
}
