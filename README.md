# Wab - Wab ain't blockchain

P2PSNSと「貨幣を代替するシステム」を統合した。

## About

インターネットの分散化を目的としたプロジェクトです。究極的にはインターネットのあらゆる機能をP2Pで置き換えることが目標です - 究極的には。

## Features

- ブラウザで開くだけ
- The servers do:
  - HTML/CSS/JSの配布
  - WebRTCのシグナリング/STUN
- The servers **do not**:
  - manage your account
    - No signup/signin
    - No tracking
    - No ban
  - receive/send/store any content
    - No censorship
    - No 表示順操作/shadowban

## Usage

Access https://aintblockchain.github.io/

左側のカードは接続してる相手で、クリック/タップで選択可能
カードにはID,名前,数字が表示されていて、名前は好きにつけられる(このサイトを閉じても、名前がついているor数字が0でない場合は次開いた時に再表示される)
数字を増減するのが左側下部で、+/-で増減、その上の数字が増減幅
好きにつけられる(このサイトを閉じても、名前がついているor数字が0でない場合は次開いた時に再表示される)

## How it works

メッセージはブラウザ内のデータベース(IndexedDB)に追加され、すべての接続相手と共有される

## Contributing

Please read [CONTRIBUTING.md](https://github.com/aintblockchain/aintblockchain.github.io/CONTRIBUTING.md).

## Author

* **K0baU** - *Initial work* - [K0baU](https://github.com/K0baU)

See also the list of [contributors](https://github.com/aintblockchain/aintblockchain.github.io/contributors) who participated in this project.

## Contact

Feel free to email fun.kobau@gmail.com if you are interested in this project.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgment

* **Taisuke Fukuno** - *wab.sabae.cc シグナリングサーバー/domain* - [taisukef](https://github.com/taisukef)
