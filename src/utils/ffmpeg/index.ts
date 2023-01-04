import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

function createFFmpge(input: string, output: string) {
  return spawn(
    'ffmpeg',
    [
      '-re', // 读取速度
      '-i', // 输入
      input,
      '-vcodec', // 视频编码
      'copy', // 视频编码
      '-acodec', // 音频编码
      'aac', // 音频编码
      '-b:a', // 音频比特率
      '192k', // 音频比特率
      '-f', // 输出格式
      'flv', // 输出格式
      output,
    ],
    {
      windowsHide: true,
    },
  );
}

/**
 * 监听推流
 */
async function listenPushStream(
  ffmpeg: ChildProcessWithoutNullStreams,
  timer?: NodeJS.Timeout | 0,
) {
  const { logger } = await import('../log');

  return new Promise<number>((resolve, reject) => {
    ffmpeg.on('close', code => {
      timer && clearTimeout(timer);
      logger.debug(`child process exited with code ${code}`);
      if (code === 255) {
        return resolve(255);
      }
      if (code !== 0) {
        return reject(code);
      }
      resolve(0);
    });

    // 正常日志输出在 stderr 中？why？
    ffmpeg.stderr.on('data', data => logger.debug(`ffmpeg out: ${data}`));
    ffmpeg.stderr.on('error', data => logger.debug(`ffmpeg err: ${data}`));
  });
}

export async function pushToStream(input: string[], output: string, timeout: number) {
  // 计时
  const time = new Date().getTime();
  // 循环推流，直到 timeout
  while (timeout > 0) {
    const code = await push();
    if (code !== 0) return code;
  }
  return 0;

  async function push() {
    const { logger } = await import('../log');
    for (const item of input) {
      logger.debug(`推流视频：【${item}】`);
      const ffmpeg = createFFmpge(item, output);
      const timer = setTimeout(() => {
        ffmpeg.kill();
        logger.info(`推流时间达到，结束推流`);
      }, timeout);
      try {
        const code = await listenPushStream(ffmpeg, timer);
        if (code !== 0) return code;
        timeout = timeout - (new Date().getTime() - time);
      } catch (error) {
        logger.error(`推流异常：`, error);
        return -1;
      }
    }
    return 0;
  }
}
