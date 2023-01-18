import { connect, start, stop, disconnect } from 'pm2';

const NAME = 'bt';

/**
 * @type {import('pm2').StartOptions}
 */
const options = {
  script: './index',
  name: NAME,
  cron: '*/3 * * * *',
  autorestart: false,
};

connect(true, err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  start(options, err => {
    if (err) {
      console.log(err);
      return disconnect();
    }

    // 启动后立即停止，确保只在 cron 时间执行
    stop(NAME, () => disconnect());
  });
});
