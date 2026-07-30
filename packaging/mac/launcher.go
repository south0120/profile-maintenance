package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const port = "8787"

// index.html をキャッシュさせない（更新版の配布時に旧画面が残るのを防ぐ）
type noCacheHTML struct{ h http.Handler }

func (n noCacheHTML) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if p == "/" || strings.HasSuffix(p, ".html") {
		w.Header().Set("Cache-Control", "no-store, must-revalidate")
	}
	n.h.ServeHTTP(w, r)
}

func main() {
	exe, err := os.Executable()
	if err != nil {
		fmt.Println("起動エラー:", err)
		return
	}
	appDir := filepath.Join(filepath.Dir(exe), "..", "app")

	// ポートが使用中 = 旧バージョンが起動中の可能性。案内して終了する
	ln, err := net.Listen("tcp", "127.0.0.1:"+port)
	if err != nil {
		fmt.Println("──────────────────────────────────────")
		fmt.Println(" すでにツールが起動中です。")
		fmt.Println(" 新しいバージョンに更新した場合は、")
		fmt.Println("  1. 開いているターミナルのウィンドウを『すべて』閉じる")
		fmt.Println("  2. もう一度「起動.command」を開く")
		fmt.Println("  3. ブラウザで command+shift+R で再読み込み")
		fmt.Println(" の順でお試しください。")
		fmt.Println("──────────────────────────────────────")
		_ = exec.Command("open", "http://localhost:"+port).Start()
		time.Sleep(15 * time.Second)
		return
	}

	go func() {
		time.Sleep(400 * time.Millisecond)
		_ = exec.Command("open", "http://localhost:"+port).Start()
	}()

	fmt.Println("──────────────────────────────────────")
	fmt.Println(" タレント実績管理・プロフィール作成ツール")
	fmt.Println(" ブラウザで http://localhost:" + port + " を開いています…")
	fmt.Println(" 終了するときは、このウィンドウを閉じてください")
	fmt.Println("──────────────────────────────────────")

	srv := &http.Server{Handler: noCacheHTML{http.FileServer(http.Dir(appDir))}}
	if err := srv.Serve(ln); err != nil {
		fmt.Println("エラー:", err)
		time.Sleep(8 * time.Second)
	}
}
