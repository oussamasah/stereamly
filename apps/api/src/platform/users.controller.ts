import {BadRequestException,ForbiddenException,Body,Controller,Get,Param,Patch,Query,Req,UseGuards} from '@nestjs/common';
import {UserRole,UserStatus} from '@prisma/client';
import {IsEnum,IsOptional,IsString,MaxLength} from 'class-validator';
import {AuthGuard,AuthenticatedRequest} from '../auth/auth.guard';
import {Roles,RolesGuard} from '../auth/roles';
import {PrismaService} from '../prisma/prisma.service';
class UserSearchDto {
  @IsOptional() @IsString() @MaxLength(100) search?:string;
}
class UserAccessDto {
  @IsEnum(UserRole) role!:UserRole;
  @IsEnum(UserStatus) status!:UserStatus;
}
@Controller('admin/users')
@UseGuards(AuthGuard,RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly prisma:PrismaService){}
  @Get() list(@Query() query:UserSearchDto) {
    const search=query.search?.trim();
    return this.prisma.user.findMany({where:search?{OR:[{email:{contains:search,mode:'insensitive'}},{displayName:{contains:search,mode:'insensitive'}}]}:undefined,select:{id:true,email:true,displayName:true,role:true,status:true,emailVerifiedAt:true,createdAt:true},orderBy:{createdAt:'desc'},take:100});
  }
  @Patch(':id') async update(@Param('id') id:string,@Body() dto:UserAccessDto,@Req() request:AuthenticatedRequest){
    if(id===request.user.id)throw new BadRequestException('CANNOT_CHANGE_OWN_ACCESS');
    return this.prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71439201)`;
      const actor=await tx.user.findUnique({where:{id:request.user.id}});
      if(actor?.role!=='SUPER_ADMIN'||actor.status!=='ACTIVE')throw new ForbiddenException();
      const user=await tx.user.findUniqueOrThrow({where:{id}});
      if(dto.status==='ACTIVE'&&!user.emailVerifiedAt)throw new BadRequestException('EMAIL_VERIFICATION_REQUIRED');
      const updated=await tx.user.update({where:{id},data:{...dto,authVersion:{increment:1}},select:{id:true,role:true,status:true}});
      await tx.refreshToken.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
      await tx.platformAudit.create({data:{actorId:request.user.id,action:'USER_ACCESS_CHANGED',entityId:id}});
      return updated;
    });
  }
}
