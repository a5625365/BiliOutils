import {
  fetchWebUpStreamAddr,
  operationOnBroadcastCode,
  startLive,
  stopLive,
} from './blink.request';
import { logger, random } from '@/utils';
import { eventSwitch, hasCmd } from '@/utils/node';
import { dirname, resolve } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { VIDEO_EXT } from './constant';

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
  const sf = () => random(true) - 0.5;
  const files = await getConfigVideoPaths();
  if (!files.length) return -1;
  return await pushToStream(files.sort(sf).sort(sf), addr.addr + addr.code, timeout);
}

async function getConfigVideoPaths() {
  const videoPaths = resolve(dirname(process.env.__BT_CONFIG_PATH__), 'video');
  if (!existsSync(videoPaths) || !statSync(videoPaths).isDirectory()) return [];
  return readdirSync(videoPaths)
    .filter(f => VIDEO_EXT.some(e => f.endsWith(e)))
    .map(f => resolve(videoPaths, f));
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
    if (!addr || !addr.addr || !addr.code) return;
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
