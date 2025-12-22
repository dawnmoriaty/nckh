import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  SetResource,
  SetAction,
  Auth,
  Public,
  CurrentUser,
  Resource,
  Action,
} from '../../common';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

/**
 * Example Controller demonstrating RBAC usage
 *
 * This controller shows different ways to use the permission system:
 * 1. @SetResource at class level + automatic action inference from HTTP method
 * 2. Explicit @SetAction decorator for custom actions (IMPORT, EXPORT)
 * 3. @Public for routes without authentication
 * 4. @Auth combined decorator for convenience
 */
@Controller('students')
@SetResource(Resource.USERS) // Class-level resource definition
export class StudentsExampleController {
  /**
   * GET /students
   * Required permission: users:READ
   * Action is inferred from HTTP GET method
   */
  @Get()
  @Auth() // Applies JwtAuthGuard + PermissionGuard
  findAll(@CurrentUser() user: RequestUser) {
    return {
      message: 'List all students',
      requestedBy: user.username,
    };
  }

  /**
   * GET /students/:id
   * Required permission: users:READ
   */
  @Get(':id')
  @Auth()
  findOne(@Param('id') id: string) {
    return { message: `Get student ${id}` };
  }

  /**
   * POST /students
   * Required permission: users:CREATE
   * Action is inferred from HTTP POST method
   */
  @Post()
  @Auth()
  create(@Body() body: Record<string, unknown>) {
    return { message: 'Create student', data: body };
  }

  /**
   * PUT /students/:id
   * Required permission: users:UPDATE
   * Action is inferred from HTTP PUT method
   */
  @Put(':id')
  @Auth()
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { message: `Update student ${id}`, data: body };
  }

  /**
   * DELETE /students/:id
   * Required permission: users:DELETE
   * Action is inferred from HTTP DELETE method
   */
  @Delete(':id')
  @Auth()
  remove(@Param('id') id: string) {
    return { message: `Delete student ${id}` };
  }

  /**
   * POST /students/import
   * Required permission: users:IMPORT
   * Explicit @Auth with resource and action
   */
  @Post('import')
  @Auth(Resource.USERS, Action.IMPORT)
  import(@Body() body: Record<string, unknown>) {
    return { message: 'Import students', data: body };
  }

  /**
   * GET /students/export
   * Required permission: users:EXPORT
   * Explicit @SetAction decorator for custom action
   */
  @Get('export')
  @SetAction(Action.EXPORT)
  @Auth()
  export() {
    return { message: 'Export students data' };
  }

  /**
   * GET /students/public-info
   * No authentication required
   */
  @Get('public-info')
  @Public()
  getPublicInfo() {
    return { message: 'This is public information' };
  }
}
