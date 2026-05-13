import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'partner@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'partner123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ example: '2026-05-20T12:00:00.000Z' })
  expiresAt: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    roles: string[];
    craftsmanId: string | null;
  };
}
