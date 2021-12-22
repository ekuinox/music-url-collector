# music-url-collector

`/api/main` に POST で以下のようなJSONメッセージを投げると、`content` 内から Spotify の URL っぽいのを探して、`targetUrl` が指し示す場所に投げる
`services` としているのは soundcloud.com とかにも対応できればと思ってたから。

```json
{
	"services": {
		"spotify": {
            "targetUrl": "https://maker.ifttt.com/trigger/{event_name}/with/key/{key}",
            "playlistName": "playlist_from_timeline"
        }
	},
	"content": "これきけ https://t.co/upTFIKLc2a"
}
```

上のメッセージに応じて、 `targetUrl` には、以下のような形式でJSON文字列が投げられます。

```json
{
    "value1": "playlist_from_timeline", 
    "value2":"1q9bLSeIlGf2xBvbOkp2Wr"
}
```

IFTTT側でうまく設定してやると良い感じにTwitterのタイムライン内で共有された楽曲を拾えると思ったのだけど、IFTTTの**New tweet from search**は、`filter:follows` みたいな検索が効かなくて、ダメでした。

~~ボケがよ...~~
