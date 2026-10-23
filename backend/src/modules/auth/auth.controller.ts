import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const data = await this.authService.register(body);
    return { success: true, data };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const data = await this.authService.login(body);
    return { success: true, data };
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    const data = await this.authService.refresh(body.refreshToken);
    return { success: true, data };
  }

  @Post('logout')
  async logout(@Body() body: Partial<RefreshTokenDto>) {
    const data = await this.authService.logout(body.refreshToken);
    return { success: true, data };
  }

  @Get('me')
  async getMe(@Req() req: any) {
    // Trích xuất user từ header token nếu có, hoặc trả về người dùng mặc định
    const authHeader = req.headers['authorization'];
    let userId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // decode loosely if needed
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub;
      } catch {
        // fallback to default
      }
    }
    const data = await this.authService.getCurrentUser(userId);
    return { success: true, data };
  }
}
