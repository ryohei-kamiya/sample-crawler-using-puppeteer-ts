import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer';
// import { ElementHandle, Page } from 'puppeteer';

const crawl = async (url: string) => {

  const redirectedUrls: { [key: string]: string } = {};
  const jsFiles: { [key: string]: string } = {};
  const links: Set<string> = new Set();
  // const clickedAnchors: { [key: string]: [string, string]} = {};

  const browser = await puppeteer.launch({headless: "new"});

  try {
    const page = await browser.newPage();
  
    const responseHandler = (response: any) => {
      // リダイレクトを検出
      if (300 <= response.status() && response.status() < 400 && response.headers().location) {
        redirectedUrls[response.url()] = response.headers().location;
      }
      // JavaScriptファイルの内容を取得
      if (response.request().resourceType() === 'script') {
        if (response.ok() && !jsFiles[response.url()]) {
          getJsContent(response);
        }
      }
    };
    const getJsContent = async (response: any) => {
      if (!jsFiles[response.url()]) {
        const content = await response.text();
        jsFiles[response.url()] = content;
      }
    };
    page.on('response', responseHandler); // 全てのコンテンツのresponseイベントを捕捉

    await page.goto(url);
  
    // コンテンツを抽出
    const content = await page.content();

    // リンク一覧を抽出
    const _links = await page.$$eval('a', (anchors: HTMLAnchorElement[]) => {
      return anchors.map(anchor => anchor.href);
    });
    for (const _link of _links) {
      links.add(_link);
    }

    // page.setRequestInterception(true);
    // page.on('request', async (request) => {
    //   if (request.resourceType() === 'document') {
    //     links.add(request.url()); // リクエスト先ドキュメントのURLを収集
    //     await page.evaluate(() => {
    //       console.log(`request url = ${request.url()}`);
    //     });
    //     request.abort(); // ページ遷移をキャンセル
    //   } else {
    //     request.abort(); // その他のリクエストもキャンセル
    //   }
    // });

    // page.on('console', async (msg) => {
    //   if (msg.text().startsWith("[Clicked URL]")) {
    //     try {
    //       const clickedUrlStr = msg.text().replace(/^\[Clicked URL\]/, '');
    //       const clickedUrl: { [key: string]: string } = JSON.parse(clickedUrlStr) as { [key: string]: string };
    //       Object.entries(clickedUrl).forEach(item => {
    //         console.log(`${item[0]} => ${item[1]}`);
    //       });
    //     } catch (error) {
    //       console.error(error);
    //     }
    //   }
    //   console.log(`Browser Console: ${msg.text()}`);
    // });
    
    // const generateSelector = async (elementHandle: ElementHandle): Promise<string> => {
    //   return await elementHandle.evaluate(element => {
    //     const selectorParts: string[] = [];
    //     let _element: HTMLElement | null = element as HTMLElement;
      
    //     while (true) {
    //       if (!_element) {
    //         break;
    //       }
    //       const tagName = _element.tagName.toLowerCase();
    //       if (tagName === 'html') {
    //         break;
    //       }
    //       const id = _element.id ? `#${_element.id}` : '';
    //       const classNames = _element.className
    //         ? `.${_element.className.trim().replace(/\s+/g, '.').replace(/^\.+|\.+$/g, '')}`
    //         : '';
    //         selectorParts.push(`${tagName}${id}${classNames}`);
    //       _element = _element.parentElement;
    //     }
      
    //     return selectorParts.reverse().join('>');  
    //   })
    // }

    // await page.evaluate(() => {
    //   document.addEventListener('click', (event) => {
    //     const generateSelectorInBrowser = (element: HTMLElement): string => {
    //       const selectorParts: string[] = [];
    //       let _element: HTMLElement | null = element;
        
    //       while (true) {
    //         if (!_element) {
    //           break;
    //         }
    //         const tagName = _element.tagName.toLowerCase();
    //         if (tagName === 'html') {
    //           break;
    //         }
    //         const id = _element.id ? `#${_element.id}` : '';
    //         const classNames = _element.className
    //           ? `.${_element.className.trim().replace(/\s+/g, '.').replace(/^\.+|\.+$/g, '')}`
    //           : '';
    //           selectorParts.push(`${tagName}${id}${classNames}`);
    //         _element = _element.parentElement;
    //       }
        
    //       return selectorParts.reverse().join('>'); 
    //     }
    //     if (event.target instanceof HTMLAnchorElement) {
    //       const actualUrl = event.target.href.replace(/"/g, "\\\"");
    //       console.log(`[Clicked URL]{"${generateSelectorInBrowser(event.target)}": "${actualUrl}"}`);
    //       event.preventDefault();
    //       event.stopPropagation();
    //     }
    //   }, false);
    // });

    // JavaScriptファイルの動的検知のため、以下の操作をページ上で実行
    // 処理1. スムーズスクロール
    // 処理2. 数秒待機
    // 処理3. リンクを動的に検出してクリック
  
    // 処理1. スムーズスクロール
    // page.evaluate(() => {
    //   window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'smooth' });
    // });  

    // 処理2. 数秒(3秒)待機
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // 処理3. リンクを動的に検出してクリック（リンクをクリックするとページコンテキストの切り替えが発生し、複数リンクのクリックが期待通りに動作しない）
    // const anchors = await page.$$('a');
    // for (const anchor of anchors) {
    //   const linkHref = await anchor.evaluate(element => element.getAttribute('href'));
    //   try {
    //     if (linkHref && typeof linkHref === 'string') {
    //       const expectedUrl = new URL(linkHref, page.url()).toString(); // 相対URLを絶対URLに変換します。
    //       links.add(expectedUrl);
    //       console.log(expectedUrl);
    //       // クリックされる要素に関連づけてURLを保存
    //       clickedAnchors[await generateSelector(anchor)] = [expectedUrl, ''];

    //       // // 処理の完了をログから確認する
    //       // const originalLog = console.log;
    //       // console.log = function(...args) {
    //       //   originalLog.apply(console, args);
            
    //       // };
    //       // 要素をクリック
    //       await anchor.click();
    //       // 処理完了のログ検出まで待機する処理を追加

    //       // // ログを元に戻す
    //       // console.log = originalLog;
    //     }
    //   } catch (error) {
    //     if (error instanceof Error) {
    //       const errmsg = error.message.toLowerCase();
    //       if (errmsg.includes('timeout')) {
    //         // ページ遷移がキャンセルされた場合、タイムアウトエラーが発生するので無視
    //         console.error(linkHref);
    //         console.error(error.message);
    //       } else if (errmsg.includes('clickable')) {
    //         console.error(linkHref);
    //         console.error(error.message);
    //       }
    //     } else {
    //       throw error;
    //     }
    //   }
    // }
    await browser.close();

    return { content, links, redirectedUrls, jsFiles };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else if (typeof error === 'string') {
      console.error(error);
    } else {
      console.error('Unknown error');
    }
    throw error;
  }
};

const crawlPage = async (url: string) => {
  try {
    const { content, links, redirectedUrls, jsFiles } = await crawl(url);
    parentPort?.postMessage({
      content,
      links,
      redirectedUrls,
      jsFiles,
    });
  } catch (error) {
    console.error("ERROR0")
    if (error instanceof Error) {
      console.error("ERROR1")
      console.error(error.message);
      parentPort?.postMessage({ "error": error.message });
    } else if (typeof error === 'string') {
      console.error(error);
      parentPort?.postMessage({ "error": error });
    } else {
      console.error('Unknown error');
      parentPort?.postMessage({ "error": 'Unknown error' });
    }
  }
};

const { url } = workerData as {
  url: string;
};
crawlPage(url);
