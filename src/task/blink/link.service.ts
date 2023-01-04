import {
  fetchWebUpStreamAddr,
  operationOnBroadcastCode,
  startLive,
  stopLive,
} from './blink.request';
import { logger, random } from '@/utils';
import { eventSwitch, hasCmd } from '@/utils/node';
import { resolvePathArray } from '@/utils/path';

/**
 * 获取链接
 */
async function getLink() {
  try {
    const { code, data, message } = await fetchWebUpStreamAddr();
    if (code !== 0) {
      logger.warn(`获取链接失败：${code} ${message}`);
      return;
    }
    return data;
  } catch (error) {
    logger.error(`获取链接异常：`, error);
  }
}

async function clickStartLive() {
  try {
    const { code, message } = await startLive(13142548);
    if (code !== 0) {
      // 4 没有权限
      logger.warn(`开播失败：${code} ${message}`);
      return;
    }
    logger.info(`开播成功`);
    return operationOnBroadcastCode();
  } catch (error) {
    logger.error(`开播异常：`, error);
  }
}

async function clickStopLive() {
  try {
    const { code, message } = await stopLive(13142548);
    if (code !== 0) {
      logger.warn(`下播失败：${code} ${message}`);
    }
    logger.info(`下播成功`);
  } catch (error) {
    logger.error(`下播异常：`, error);
  }
}

async function startLiveByRtmp(addr: { addr: string; code: string }, timeout: number) {
  const { pushToStream } = await import('@/utils/ffmpeg');
  // 根据 files 轮流推流
  const files = resolvePathArray([
    './config/demo.mkv',
    './config/demo1.mkv',
    './config/demo2.mkv',
  ]).sort(() => random() - 0.5);
  return await pushToStream(files, addr.addr + addr.code, timeout);
}

export async function linkService() {
  const sigintSwitch = eventSwitch('SIGINT', () => clickStopLive().then(() => process.exit(0)));
  try {
    if (!(await hasCmd('ffmpeg'))) {
      logger.error('未安装 ffmpeg');
      return;
    }
    // 获取推流地址
    const { addr } = (await getLink()) || {};
    if (!addr) return;
    if (!(await clickStartLive())) return;
    sigintSwitch.on();
    // 开始推流，超时 30 分钟
    await startLiveByRtmp(addr, 30 * 60 * 1000 + 1000);
    await clickStopLive();
  } catch (error) {
    logger.error(`直播异常：`, error);
    await clickStopLive();
  }
  sigintSwitch.off();
}

// TODO: 开发中ing
(async () => {
  await linkService();
})();
