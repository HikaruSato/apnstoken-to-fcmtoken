var inputTargets = null;
var targetFile = null;
$(function(){
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        alert('このブラウザはファイルAPIがサポートされていません。');
        return;
    }
    
    String.prototype.isEmpty = function() {
        return (this.length === 0 || !this.trim());
    };
    
    document.getElementById('startBtn').onclick = function(){ 
        importAPNTokenToFCM(inputTargets, function (targets) {
            var csvText = arrayToCSV(targets);
            executeFileDownload(csvText, targetFile.name.replace('.csv', '') + '_fcm.csv');
        }, function (message) {
            alert(message);
        });
    }
    
    $('.filebox').on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    })
    .on('dragover dragenter', function() {
        $('.filebox').addClass('is-dragover');
    })
    .on('dragleave dragend drop', function() {
        $('.filebox').removeClass('is-dragover');
    })
    .on('drop', function(evt) {
        var file = evt.originalEvent.dataTransfer.files[0];
        readFile(file);
    });
});
function onChangedFiles(files) {
    var file = files[0];
    readFile(file);
}

function readFile(file) {
    var reader = new FileReader();
    reader.readAsText(file);
    document.getElementById('inputFileName').innerHTML = '読み込み中...';
    reader.onload = function(event) {
        var result = event.target.result;
        targetFile = file;
        inputTargets = CSVToArray(result);
        document.getElementById('inputFileName').innerHTML = file.name;
    };
    reader.onerror = function() {
        document.getElementById('inputFileName').innerHTML = "";
        alert('ファイルが読み込めませんでした。 ' + file.name);
        console.log('ファイルが読み込めませんでした。 ' + file.name);
    };
}

function executeFileDownload(text, filename) {
    var blob = new Blob([text], {type: "text/plain"});
    saveAs(blob, filename);
}

SOURCE_CSV_COLUMN = {
    apnsToken: 0 //APNSトークン
}
function importAPNTokenToFCM(targets, didComplete, didError) {
    var tokensArray = [];
    var tokens = [];
    var skipCount = 0;
    var isOccurredError = false;
    
    var fcmApiKey = document.getElementById('fcmApiKey').value;
    if (fcmApiKey.isEmpty()) {
        didError('FCM API KEY を入力してください。');
        return;
    }
    
    var bundleId = document.getElementById('bundleId').value;
    if (bundleId.isEmpty()) {
        didError('Bundle ID を入力してください。');
        return;
    }
    
    var isSandbox = document.getElementById('sandbox').checked;
    
    if(!inputTargets) {
        didError('入力ファイル（apnsTokenリスト）を選択してください。');
        return;
    }
    var targets = inputTargets;
    $('#log').append('処理開始\n');
    for(var i=0; i<targets.length; i++) {
      var rowData = targets[i];
      var token = rowData[SOURCE_CSV_COLUMN.apnsToken];
      if (token == null || token.length == 0) {
        continue;
      }
      if (tokens.length < 100) {
        tokens.push(token)
      } else {
        //100件超え
        tokensArray.push(tokens)
        tokens = []
        tokens.push(token)
      }
    }
    tokensArray.push(tokens);
    var progress = 0;
    var jqXHRList = [];
    var occurredError = false;
    for(var i=0; i<tokensArray.length; i++) {
        if (occurredError) return;
        // POSTリクエストするjsonを作成
        var payload = {};
        var apnTokens = tokensArray[i]
        if (apnTokens.length == 0) {
            continue;
        }
        
        var count = apnTokens.length;
        
        payload = {
            'application':bundleId,
            'sandbox':isSandbox,
            'apns_tokens': apnTokens
        };
        // 通信実行
        jqXHRList.push($.ajax({
            type:"post", // method = "POST"
            url:"https://iid.googleapis.com/iid/v1:batchImport", // POST送信先のURL
            data:JSON.stringify(payload), // JSONデータ本体
            async: true, //非同期通信
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key=' + fcmApiKey
          },
          dataType: "json", // レスポンスをJSONとしてパースする
          success: function(jsonData) {  // HTTP Status:200 OK時
              progress++;
              var log = "batchImport: " + progress +"/" + tokensArray.length + " 個目レスポンス受信...";
              console.log(log);
              var $logTextArea = $('#log');
              $logTextArea.append(log + '\n');
              $logTextArea.scrollTop($logTextArea[0].scrollHeight - $logTextArea.height());
          },
          error: function() {  // HTTPエラー時
              if (occurredError) return;
              occurredError = true;
              didError('通信エラーが発生しました。');
          },
          complete: function() { /*成功・失敗に関わらず通信完了した際の処理*/ }
        }));
    }
    // $.when関数を利用する
    // $.whenは可変長引数を取るので、apllyメソッドを利用して配列で渡せるようにする
    // $.whenのコンテキスト(applyの第一引数)はjQueryである必要があるので $ を渡す
    $.when.apply($, jqXHRList).done(function () {
        if (isOccurredError) {
             return;
        }
        //全通信終了時
        // 結果は仮引数に可変長で入る 
        // 取り出すには arguments から取り出す
        // さらにそれぞれには [data, textStatus, jqXHR] の配列になっている
        for (var i = 0; i < arguments.length; i++) {
            var result = arguments[i];
            if (!result) {    // サーバが失敗を返した場合
                didError();
                isOccurredError = true;
                return;
            } 

            var resultsOfResponse = null;
            if (result instanceof Array) {
                var jsonData = result[0];
                resultsOfResponse = jsonData["results"];
            } else if (typeof result == "object") {
                if ( result["results"] != null) {
                    resultsOfResponse = result["results"];
                }
            }
            
            if (!resultsOfResponse) {
                continue;
            }

            var offset = i * 100 + skipCount;
            for(var j=0; j<resultsOfResponse.length; j++) {
              var row = resultsOfResponse[j];
              var target = targets[j + offset];
              var apnsToken = target[0];
              target[1] = apnsToken;
              if (row["registration_token"]) {
                target[0] = row["registration_token"];
              } else {
                target[0] = "FailureRegistrationToken";
                var err = row["status"];
                if (err) {
                  target[2] = err;
                }
              }
            }
        }
        var log = "batchImport完了";
        console.log(log);
        $('#log').append(log + '\n');
        didComplete(targets);
    });
}

function arrayToCSV(array) {
    var body = array.map(function(row){
        return row.map(function(d) {
            return d;
        }).join(',');
    }).join("\n");

    return  body;
}

// ref: http://stackoverflow.com/a/1293163/2343
function CSVToArray( strData, strDelimiter ){
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp(
        ("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"),
        "gi"
        );
    var arrData = [[]];
    var arrMatches = null;
    while (arrMatches = objPattern.exec( strData )){
        var strMatchedDelimiter = arrMatches[ 1 ];
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){
            arrData.push([]);
        }
        var strMatchedValue;
        if (arrMatches[2]){
            strMatchedValue = arrMatches[2].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );
        } else {
            strMatchedValue = arrMatches[3];
        }
        
        arrData[arrData.length - 1].push( strMatchedValue );
    }

    return( arrData );
}
