import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { openDB } from 'idb';
import 'video.js/dist/video-js.css';
import muxjs from "mux.js";

function App() {
  const db = useRef();
  const video2Ref = useRef(null);
  const mediaSource = new MediaSource();
  const transmuxer = new muxjs.mp4.Transmuxer();
  const mime = 'video/mp4; codecs="mp4a.40.2,avc1.64001f"';
  const urlVideo = 'https://content.jwplatform.com/manifests/yp34SRmf.m3u8';
  const urlVideo2 = 'https://d2f4esnoce5l6k.cloudfront.net/smil:289360NTSkR638Pu63hLFUMecjMEDIA202209261450431664178643652JzwOomp4.smil/playlist.m3u8';
  const urlVideo3 = 'https://d2f4esnoce5l6k.cloudfront.net/smil:2877209wO3fxQMroSJ8UBKFxLGMEDIA202211181552331668761553922fcGdump4.smil/playlist.m3u8';
  const urlVideo4 = 'https://d2f4esnoce5l6k.cloudfront.net/smil:246720eLF5MRmJIBQcs80HWaMfMEDIA202211151139481668487188632AJn5tmp4.smil/playlist.m3u8';

  const segments = [
    "https://d2f4esnoce5l6k.cloudfront.net/smil:246720xrYY0o40sgVA88rM2BE0MEDIA2022121609490016711589404597YX3Wmp4.smil/media_b2628000_0.ts",
    "https://d2f4esnoce5l6k.cloudfront.net/smil:246720xrYY0o40sgVA88rM2BE0MEDIA2022121609490016711589404597YX3Wmp4.smil/media_b2628000_1.ts",
    "https://d2f4esnoce5l6k.cloudfront.net/smil:246720xrYY0o40sgVA88rM2BE0MEDIA2022121609490016711589404597YX3Wmp4.smil/media_b2628000_2.ts",
    "https://d2f4esnoce5l6k.cloudfront.net/smil:246720xrYY0o40sgVA88rM2BE0MEDIA2022121609490016711589404597YX3Wmp4.smil/media_b2628000_3.ts",
  ];

  const createDB = async () => {
    db.current = await openDB('download', 1, {
      upgrade(db, oldVersion, newVersion, transaction) {
        db.createObjectStore('video');
      }
    });
  };

  const saveToIDB = async (data) => {
    const tx = await db?.current?.transaction('video', 'readwrite');
    const store = tx?.objectStore('video');
    await store.add(data, '1');
    await tx.done;
  };

  const getData = async () => {
    const transaction = await db?.current?.transaction('video', 'readonly');
    const store = transaction?.objectStore('video');
    const video = await store?.get('1');
    return video || null;
  };

  useEffect(() => {
    (async () => {
      await createDB();
    })();

    (async () => {
      await createDB();
      const data = await getData();
      if (data) {
        const mergedArray = mergeListArrayBuffer([...data]);
        appendSegments(mergedArray)
      }
    })();

    video2Ref.current.src = URL.createObjectURL(mediaSource);
  }, []);

  const fetchData = async (url) => {
    const response = await (await fetch(url)).arrayBuffer();
    return new Uint8Array(response);
  };

  const appendSegments = (data) => {
    if (segments.length == 0){
      mediaSource.endOfStream();
      return;
    }

    URL.revokeObjectURL(video2Ref.current.src);
    
    const sourceBuffer = mediaSource.addSourceBuffer(mime);
    sourceBuffer.addEventListener('updateend', () => {
      mediaSource.endOfStream();
    });

    transmuxer.off('data');
    transmuxer.on('data', (segment) => {
      let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
      data.set(segment.initSegment, 0);
      data.set(segment.data, segment.initSegment.byteLength);
      sourceBuffer.appendBuffer(data);
    })

    transmuxer.push(new Uint8Array(data));
    transmuxer.flush();
  }

  const fetchTSFiles = async (url) => {
    const listm3u8 = await fetchM3u8(url);
    const content =  await (await fetch(listm3u8)).text();
    const lines = content.split('\n');
    const listTs = [...lines].filter(item => item.includes('.ts'));
    const isChunkList = listm3u8.includes('/chunklist');

    const compileAllTs = [...listTs].map((item, index) => {
      if (!isChunkList) {
        return listm3u8.replace(/(.mp4)\.m3u8/, `$1-${index}.ts`);
      } else {
        return listm3u8.replace(/\/chunklist.*/, `/${item}`);
      }
    })

    const mappingFetchTs = compileAllTs?.map((segment) => fetchData(segment));
    const data = await Promise.all(mappingFetchTs);
    return data;
  };

  const mergeListArrayBuffer = (myArrays) => {
    let length = 0;
    myArrays.forEach(item => {
      length += item.length;
    });

    let mergedArray = new Uint8Array(length);
    let offset = 0;
    myArrays.forEach(item => {
      mergedArray.set(item, offset);
      offset += item.length;
    });

    return mergedArray;
  };

  const fetchM3u8 = async (url) => {
    const m3u8Content = await (await fetch(url)).text();
    const lines = m3u8Content.split('\n');
    const segmentUrls = [];
    for (let line of lines) {
      if(line.startsWith("http")){
        segmentUrls.push(line);
      }
    }

    if (segmentUrls.length) {
      return segmentUrls[0];
    } else {
      // check chunklist
      const chunklist = lines.filter(item => item.includes('.m3u8'));
      let newUrl = url.replace('/playlist.m3u8', `/${chunklist[0]}`);
      return newUrl;
    }
  };

  const handleDownload = async () => {
    const data = await fetchTSFiles(urlVideo2);
    await saveToIDB(data);
    alert('Download xong. Reload lại đi.');
  };

  return (
    <div className="App">
      <div style={{margin: '50px'}}>
        <p>Url Video: {urlVideo}</p>
        <button onClick={handleDownload}>Click to download</button>
      </div>
      <video ref={video2Ref} controls className='video' id='video'>
      </video>
    </div>
  );
}

export default App;
