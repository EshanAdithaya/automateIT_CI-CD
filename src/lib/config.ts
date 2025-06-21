import { config } from 'dotenv';

config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  
  GITHUB: {
    TOKEN: process.env.GITHUB_TOKEN,
    WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  },
  
  GITLAB: {
    TOKEN: process.env.GITLAB_TOKEN,
    WEBHOOK_SECRET: process.env.GITLAB_WEBHOOK_SECRET,
  },
  
  DATABASE_URL: process.env.DATABASE_URL,
  
  DOCKER: {
    REGISTRY_URL: process.env.DOCKER_REGISTRY_URL,
    REGISTRY_USERNAME: process.env.DOCKER_REGISTRY_USERNAME,
    REGISTRY_PASSWORD: process.env.DOCKER_REGISTRY_PASSWORD,
  },
  
  PIPELINE: {
    DEFAULT_BUILD_TIMEOUT: parseInt(process.env.DEFAULT_BUILD_TIMEOUT || '1800'),
    DEFAULT_TEST_TIMEOUT: parseInt(process.env.DEFAULT_TEST_TIMEOUT || '600'),
    AUTO_DEPLOY_ENABLED: process.env.AUTO_DEPLOY_ENABLED === 'true',
  },
  
  MONITORING: {
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  },
  
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || 'change_me_in_production',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'change_me_in_production',
  },
};

export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTesting = ENV.NODE_ENV === 'test';