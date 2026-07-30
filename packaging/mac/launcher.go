package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const port = "8787"

func main() {
	exe, err := os.Executable()
	if err != nil {
		fmt.Println("起動エラー:", err)
		return
	}
	appDir := filepath.Join(filepath.Dir(exe), "..", "app")

	go func() {
		time.Sleep(500 * time.Millisecond)
		_ = exec.Command("open", "http://localhost:"+port).Start()
	}()

	fmt.Println("──────────────────────────────────────")
	fmt.Println(" タレント実績管理・プロフィール作成ツール")
	fmt.Println(" ブラウザで http://localhost:" + port + " を開いています…")
	fmt.Println(" 終了するときは、このウィンドウを閉じてください")
	fmt.Println("──────────────────────────────────────")

	http.Handle("/", http.FileServer(http.Dir(appDir)))
	if err := http.ListenAndServe("127.0.0.1:"+port, nil); err != nil {
		// すでに起動中の場合など。ブラウザは開いているのでそのまま案内する
		fmt.Println("※すでに起動中のようです。開いたブラウザ画面をご利用ください。")
		time.Sleep(8 * time.Second)
	}
}
