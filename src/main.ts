import { program } from 'commander';
import { Worker } from 'worker_threads';
import { url2dirpath, makedir, loadUrlsInFile, output, makeSymlink } from './utils/io_util';
import { v4 as uuidv4 } from 'uuid';


const crawlPages = (urls: string[], outputRootDir: string): void => {
  const browserDirPath = `${outputRootDir}/chromium`;
  makedir(browserDirPath);

  const allProcessedUrlsPath = `${browserDirPath}/all_processed_urls.txt`;
  const allRedirectedUrlsPath = `${browserDirPath}/all_redirected_urls.txt`;
  const allErrorUrlsPath = `${browserDirPath}/all_error_urls.txt`;
  const allSuspiciousUrlsPath = `${browserDirPath}/all_suspicious_urls.txt`;

  urls.forEach(async (url) => {
    const worker = new Worker('./dist/workers/crawler.js', {
      workerData: { url },
    });

    worker.on('message', (message) => {
      console.log(`URL: ${url}`);
      console.log(`Browser: chromium`);

      const content = message.content;
      const links = message.links;
      const redirectedUrls = message.redirectedUrls;
      const jsFiles = message.jsFiles;

      let dirpath = url2dirpath(url);
      try {
        makedir(`${browserDirPath}/page/${dirpath}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        } else if (typeof error === 'string') {
          console.error(error);
        } else {
          console.error('Unknown error');
        }
        dirpath = `__${uuidv4()}`;
        makedir(`${browserDirPath}/page/${dirpath}`);
      }
      dirpath = `${browserDirPath}/page/${dirpath}`;
      output(content, `${dirpath}/content.html`);
      output(links, `${dirpath}/links.txt`);

      // ページ内のJavaScriptファイルを出力
      for (const [jsUrl, jsContent] of Object.entries(jsFiles)) {
        let jsDirpath: string = url2dirpath(jsUrl);
        try {
          makedir(`${browserDirPath}/js/${jsDirpath}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(error.message);
          } else if (typeof error === 'string') {
            console.error(error);
          } else {
            console.error('Unknown error');
          }
          jsDirpath = `__${uuidv4()}`;
          makedir(`${browserDirPath}/js/${jsDirpath}`);
        }
        jsDirpath = `${browserDirPath}/js/${jsDirpath}`;
        output(jsContent, `${jsDirpath}/script.js`);  // JavaScriptのURLに対応するディレクトリに保存
        const realfile = `${jsDirpath}/script.js`;
        const linkfile = `${dirpath}/${uuidv4()}.js`;
        makeSymlink(realfile, linkfile);  // リンク元のページのディレクトリにシンボリックリンクを置く
      }

      output(url, allProcessedUrlsPath, 'a');
      output(redirectedUrls, allRedirectedUrlsPath, 'a');
    });

    worker.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      output(url, allErrorUrlsPath, 'a');
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        output(url, allSuspiciousUrlsPath, 'a');
      }
    });
  });
};


const main = (): void => {
  // コマンドラインオプションを解析
  program
    .option('-u, --url-file <file>', 'URLリストを含むファイル', './test/test-urls.txt')
    .option(
      '-o, --output-root-dir <dir>',
      '処理結果の保存先ディレクトリのパス',
      './output'
    )
    .parse(process.argv);

  const options = program.opts();

  if (!options.urlFile || !options.outputRootDir) {
    console.error('必要なオプションが指定されていません。');
    process.exit(1);
  }

  const urlFile = options.urlFile;
  const outputRootDir = options.outputRootDir;

  // URLリストをファイルから読み込む
  const urls = loadUrlsInFile(urlFile);

  // クロールを実行
  crawlPages(urls, outputRootDir);
};


main();
