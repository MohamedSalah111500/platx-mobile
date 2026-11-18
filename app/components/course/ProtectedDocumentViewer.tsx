import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const PDFJS_ORIGIN = 'https://cdnjs.cloudflare.com/';
const PDFJS_PATH = 'ajax/libs/pdf.js/3.11.174/';

export const PDF_MIME = 'application/pdf';

export function canPreviewProtected(mimeType: string): boolean {
  return mimeType === PDF_MIME || mimeType.startsWith('image/');
}

const PAGE_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html,body{background:#1a1a1a}
#pages{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px}
canvas,img{display:block;max-width:100%;background:#fff;pointer-events:none}
.ph{width:100%;background:#2a2a2a}
</style>
<script src="${PDFJS_PATH}pdf.min.js"></script>
</head><body oncontextmenu="return false">
<div id="pages"></div>
<script>
function post(type){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(type)}
window.openImage=function(url,headers){
  fetch(url,{headers:headers}).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var img=document.createElement('img');img.onload=function(){post('ready')};img.onerror=function(){post('failed')};
    img.src=URL.createObjectURL(b);document.getElementById('pages').appendChild(img);
  }).catch(function(){post('failed')});
};
window.openPdf=function(url,headers){
  try{
    pdfjsLib.GlobalWorkerOptions.workerSrc='${PDFJS_PATH}pdf.worker.min.js';
    pdfjsLib.getDocument({url:url,httpHeaders:headers,disableRange:true,disableStream:true,disableAutoFetch:true}).promise.then(function(pdf){
      var host=document.getElementById('pages'),width=host.clientWidth-16,ratio=Math.min(window.devicePixelRatio||1,2);
      var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);draw(e.target)}})},{rootMargin:'800px 0px'});
      function draw(slot){pdf.getPage(Number(slot.dataset.page)).then(function(page){
        var base=page.getViewport({scale:1}),vp=page.getViewport({scale:(width/base.width)*ratio});
        var c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.style.width=width+'px';c.style.height=(vp.height/ratio)+'px';
        page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){slot.replaceWith(c)});
      })}
      pdf.getPage(1).then(function(first){
        var v=first.getViewport({scale:1}),h=width*v.height/v.width;
        for(var i=1;i<=pdf.numPages;i++){var d=document.createElement('div');d.className='ph';d.style.height=h+'px';d.dataset.page=i;host.appendChild(d);io.observe(d)}
        post('ready');
      });
    },function(){post('failed')});
  }catch(e){post('failed')}
};
post('loaded');
</script></body></html>`;

interface Props {
  url: string;
  token: string | null;
  mimeType: string;
  failedText: string;
}

export function ProtectedDocumentViewer({ url, token, mimeType, failedText }: Props) {
  const webRef = useRef<WebView>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    const type = event.nativeEvent.data;
    if (type === 'loaded') {
      const headers = JSON.stringify(token ? { Authorization: `Bearer ${token}` } : {});
      const opener = mimeType === PDF_MIME ? 'openPdf' : 'openImage';
      webRef.current?.injectJavaScript(`window.${opener}(${JSON.stringify(url)},${headers});true;`);
    } else if (type === 'ready' || type === 'failed') {
      setState(type);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: PAGE_HTML, baseUrl: PDFJS_ORIGIN }}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onMessage}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        style={styles.webview}
      />
      {state !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          {state === 'loading' ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.failedText}>{failedText}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  webview: { flex: 1, backgroundColor: '#1a1a1a' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 24,
  },
  failedText: { color: '#adb5bd', fontSize: 16, fontFamily: 'Cairo_500Medium', textAlign: 'center' },
});
