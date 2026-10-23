import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe() {
    const data = await this.usersService.getProfile();
    return { success: true, data };
  }

  @Patch('me')
  async updateMe(@Body() body: { email?: string; fullName?: string }) {
    const data = await this.usersService.updateProfile(body);
    return { success: true, data };
  }

  @Get('me/preferences')
  async getPreferences() {
    const data = await this.usersService.getPreferences();
    return { success: true, data };
  }
}
