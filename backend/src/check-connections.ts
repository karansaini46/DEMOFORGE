import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkConnections() {
  console.log('--- Checking Connections ---');

  // 1. Check DB (Prisma)
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database (PostgreSQL via Prisma): Connected successfully');
  } catch (error) {
    console.error('❌ Database (PostgreSQL via Prisma): Connection failed', error);
  }

  // 2. Check Redis
  let redis: any;
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    try {
      const pingRes = await redis.ping();
      if (pingRes === 'PONG') {
        console.log('✅ Redis: Connected successfully');
      } else {
        console.error('❌ Redis: Connection failed - ping returned', pingRes);
      }
    } catch (error) {
      console.error('❌ Redis: Connection failed', error);
    }
  } else {
    console.error('❌ Redis: Connection failed - REDIS_URL is not set in .env');
  }

  // 3. Check Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    try {
      const { data, error } = await supabaseService.auth.admin.listUsers({ perPage: 1 });
      if (error) {
        console.error('❌ Supabase: Connection failed (Service Role API check error)', error.message);
      } else {
        console.log('✅ Supabase: Connected successfully (Service Role API)');
      }
    } catch (error) {
      console.error('❌ Supabase: Connection failed', error);
    }
  } else {
      console.error('❌ Supabase: Connection failed - SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in .env');
  }

  console.log('--- Check Complete ---');
  
  // Cleanup
  await prisma.$disconnect();
  if (redis) redis.disconnect();
}

checkConnections().catch(console.error);
