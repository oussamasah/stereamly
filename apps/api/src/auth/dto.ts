import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @Length(12, 128) password!: string;
  @IsString() @Length(2, 80) displayName!: string;
  @IsIn(['fr', 'en', 'ar']) locale!: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
}
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
export class TokenDto { @IsString() @Length(32, 256) token!: string; }
export class ForgotPasswordDto { @IsEmail() email!: string; }
export class ResetPasswordDto extends TokenDto { @IsString() @Length(12, 128) password!: string; }

