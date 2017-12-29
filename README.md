# apntoken-to-fcmtoken

iOSアプリのAPNSTokenをFCM(Firebase Cloud Messaging）のToken(registrationID)に変換するツールを作りました。

https://hikarusato.github.io/apnstoken-to-fcmtoken/
[![APNS TO FCM TOKEN](https://qiita-image-store.s3.amazonaws.com/0/37373/aa46cb31-57c1-b981-ca4d-f129b2dc00cf.png)](https://hikarusato.github.io/apnstoken-to-fcmtoken/)

# 作った経緯
iOSアプリのPUSH通知をFCMで行うようにするとAndroidアプリと一緒にPUSH通知関連の管理ができるし１リクエストで複数人にプッシュ通知できるし、かなり便利だと思います。しかも、iOSアプリにFirebaseのSDKを組み込む前にできてしまう。
でも、それ（iOSアプリにFirebaseのSDKを組み込む前にFCMでプッシュ通知）をやるためには下記のAPIを利用する必要があり、次のような制限があります。

https://developers.google.com/instance-id/reference/server#create_registration_tokens_for_apns_tokens

* GUIで変換するツールが無い（もしかしたら、私の探し方が悪いだけ存在しているのかもしれませんが）ので、エンジニア以外に変換をお願いできない。
* 1度のAPIリクエストにのせられるAPNS Tokenは100個まで。

これらを解消するため作成しました。

# 利用対象
ニッチだと思いますが、下記のいずれかだと思います。

* iOSアプリにFirebaseのSDKを組み込む前にFCMでプッシュ通知がしたい。
* あるいは、FirebaseのSDKを組み込んだがFCMのToken(registrationID)をサーバーのDBに保存できていない。

# 使い方
１. FCM Server KeyのところにFirebaseのプロジェクトの設定->クラウドメッセージング->サーバーキーを入力。
２. iOSアプリのBundleIDを入力。
３. Sandboxの場合チェックオンする。
４. APNSTokenが改行区切りで入ったUTF8のcsvファイルをドラッグ&ドロップする。

```csv:APNSTokenリスト内容例:
test001a775fa3f12d4c714058a799f47ca5aa1028839e874f1080ceb8c4fe3b
test002cc4d396422d1a257b93f3bc0584de40fa961f4cfff09112a6f89890c9
test0037f30c67ce13756b28c90b2a2a2c4f4602a6032c4c58ec494112e8c3b7
test00470cc1c7885356c22ee185dba8c4c292906fb2652a1a0c09a0bae26119
test005a5378d2e78268e4a2975a9e166b137f8dd757b9f52130edeb1fc766a1

```
５. [START CONVERT]ボタンをクリックする。下記のような感じでLogの部分に進捗が表示されて、終わったらファイル保存ダイアログが開きます。
![apns_to_fcm.gif](https://qiita-image-store.s3.amazonaws.com/0/37373/72dd92be-9a83-742c-1810-2753fe66c0fe.gif)
作成されるcsvファイルには、

 * １カラム目には変換後のFCMToken(RegistrationID)
 * 2カラム目には変換前のAPNSToken

が入っています。

# 動作環境
次の環境で動作確認済み。

## macOS Sierra(v10.12.6)
* Chrome v63.0.3239.108
* Safari v11.0.2
