import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { RedisClient } from 'redis';
import { EntityManager } from 'typeorm';
import { LoggerInstance } from 'winston';

import { Auth, AuthUser, isNumber, LoggerToken, RedisClientToken, Roles } from '../../common';
import { Todo, User } from '../../entity';
import { InjectCustomReposity } from '../../lib/typeorm';
import { TodoRepository } from '../../repository';
import { CreateTodoDtoIndicative } from './todo.dto';

@ApiUseTags('todos')
@Controller('todos')
export class TodoController {
  constructor(
    @Inject(LoggerToken) private readonly logger: LoggerInstance,
    @Inject(RedisClientToken) private readonly redisClient: RedisClient,
    @Inject(EntityManager) private readonly em: EntityManager,
    @InjectCustomReposity(Todo) private readonly todoRepository: TodoRepository
  ) {}

  @Auth(Roles.User)
  @Post()
  async create(@Body() body: CreateTodoDtoIndicative, @AuthUser() authUser: User) {
    const todo = new Todo();
    todo.title = body.title;
    todo.description = body.description;
    todo.user = authUser;

    this.redisClient.setex('todo', 300, JSON.stringify(todo), (err, reply) => {
      if (err) return this.logger.error('SETEX', err.message);
      this.logger.log('SETEX', 'OK');
    });

    return this.em.save(Todo, todo);
  }

  @Get()
  async read(
    @Query('limit', isNumber)
    limit: number = 10,
    @Query('offset', isNumber)
    offset: number = 0,
    @AuthUser() authUser: User
  ) {
    this.logger.info('Auth User', authUser);
    const todos = await this.todoRepository.find({ take: limit, skip: offset });
    return { data: todos };
  }

  @Get(':id')
  async readOne(
    @Param('id', isNumber)
    id: number
  ) {
    const todo = await this.todoRepository.findOneById(id);
    if (!todo) throw new BadRequestException('Todo was not found.');
    return { data: todo };
  }

  @Put(':id')
  async update() {}

  @Delete(':id')
  async delete(
    @Param('id', isNumber)
    id: number
  ) {}
}
