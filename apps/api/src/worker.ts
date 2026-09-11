import { NestFactory } from '@nestjs/core';

async function bootstrap(){
  process.env.IMPORT_EXECUTION_MODE='worker';
  const {AppModule}=await import('./app.module');
  await NestFactory.createApplicationContext(AppModule,{logger:['error','warn','log']});
}

void bootstrap();
