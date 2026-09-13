import{Module}from'@nestjs/common';import{AuthModule}from'../auth/auth.module';import{CommerceController}from'./commerce.controller';import{RenewalController}from'./renewal.controller';import{CommerceService}from'./commerce.service';
@Module({imports:[AuthModule],controllers:[CommerceController,RenewalController],providers:[CommerceService],exports:[CommerceService]})export class CommerceModule{}
