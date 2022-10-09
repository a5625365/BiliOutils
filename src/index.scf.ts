import type { SCFContext, SCFEvent } from './types/scf';
import { defLogger } from './utils/log/def';
import { JSON5 } from './utils/json5';

/**
 * 公告
 */
const notice = async (msg?: string) => {
  defLogger.warn(msg || `SCF从9月开始会对日志进行收费！`);
};

export async function dailyMain(event: SCFEvent, context: SCFContext) {
  notice();
  const { dailyHandler } = await import('./utils/serverless');
  return await dailyHandler
    .init({
      event,
      context,
      slsType: 'scf',
    })
    .run();
}

export async function main_handler(event: SCFEvent, context: SCFContext) {
  let isReturn = false;
  if (event.Message) {
    isReturn = await runTasks(event.Message);
  }
  if (isReturn) return 'success';
  return dailyMain(event, context);
}

export async function runTasks(payload: string) {
  try {
    const { runInputBiliTask } = await import('./task');
    const payloadJson = JSON5.parse(payload);
    if (payloadJson.task) {
      await runInputBiliTask(payloadJson.task);
      return true;
    }
  } catch {}
  return false;
}
