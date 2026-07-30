# Mac配布パッケージの作り方（提供側の保守手順）

1. `npm run build` でdistを生成
2. ランチャーをクロスコンパイル:
   `GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -ldflags="-s -w" -o server-arm64 launcher.go`
   `GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o server-x64 launcher.go`
3. フォルダ構成: タレント実績管理ツール/{起動.command, はじめにお読みください.txt, app/(distの中身), bin/(server-arm64, server-x64)}
4. 実行権限を付与して zip -ry で圧縮

※将来: Apple Developer署名+公証(.dmg化)で初回の右クリック手順を不要にできる（保守項目）
