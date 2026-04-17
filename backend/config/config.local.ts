import { EggAppConfig, PowerPartial } from 'egg';

export default (): PowerPartial<EggAppConfig> => {
  const config: PowerPartial<EggAppConfig> = {};

  config.logger = {
    level: 'DEBUG',
    consoleLevel: 'DEBUG',
  };

  return config;
};
