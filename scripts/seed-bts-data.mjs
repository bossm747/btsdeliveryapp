import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

// WebSocket polyfill for Neon
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedBtsData() {
  console.log('🚀 Seeding BTS Operational Data...');
  
  try {
    const client = await pool.connect();
    
    // Seed BTS Riders - Based on actual names from spreadsheet analysis
    console.log('📋 Seeding BTS Riders...');
    
    const riderData = [
      {
        rider_name: 'ADRIAN',
        rider_code: 'BTR001',
        phone_number: '09123456789',
        email: 'adrian@bts.delivery',
        vehicle_type: 'Motorcycle',
        commission_rate: 0.02,
        base_salary: 8000.00
      },
      {
        rider_name: 'ALFREDO', 
        rider_code: 'BTR002',
        phone_number: '09123456790',
        email: 'alfredo@bts.delivery',
        vehicle_type: 'Motorcycle',
        commission_rate: 0.02,
        base_salary: 8000.00
      },
      {
        rider_name: 'CHANO',
        rider_code: 'BTR003', 
        phone_number: '09123456791',
        email: 'chano@bts.delivery',
        vehicle_type: 'Motorcycle',
        commission_rate: 0.02,
        base_salary: 8000.00
      },
      {
        rider_name: 'DOMINIC',
        rider_code: 'BTR004',
        phone_number: '09123456792',
        email: 'dominic@bts.delivery',
        vehicle_type: 'Motorcycle',
        commission_rate: 0.02,
        base_salary: 8000.00
      },
      {
        rider_name: 'ERIC',
        rider_code: 'BTR005',
        phone_number: '09123456793',
        email: 'eric@bts.delivery',
        vehicle_type: 'Motorcycle',
        commission_rate: 0.02,
        base_salary: 8000.00
      }
    ];
    
    for (const rider of riderData) {
      await client.query(`
        INSERT INTO bts_riders (
          rider_name, rider_code, phone_number, email, 
          vehicle_type, commission_rate, base_salary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (rider_code) DO UPDATE SET
          rider_name = EXCLUDED.rider_name,
          phone_number = EXCLUDED.phone_number,
          email = EXCLUDED.email,
          vehicle_type = EXCLUDED.vehicle_type,
          commission_rate = EXCLUDED.commission_rate,
          base_salary = EXCLUDED.base_salary
      `, [
        rider.rider_name, rider.rider_code, rider.phone_number,
        rider.email, rider.vehicle_type, rider.commission_rate, rider.base_salary
      ]);
    }
    
    // Seed Sales Remittance Data - Based on actual BTS data (₱8,886.00 total found)
    console.log('💰 Seeding Sales Remittance Data...');
    
    const salesData = [
      {
        rider_code: 'BTR001',
        remit_date: '2025-01-08',
        daily_sales: 1850.00,
        commission_amount: 37.00, // 2% of sales
        remitted_amount: 1813.00,
        week_period: 'jan 4-jan 10',
        reference_number: 'REF001-250108'
      },
      {
        rider_code: 'BTR002',
        remit_date: '2025-01-08', 
        daily_sales: 2200.00,
        commission_amount: 44.00,
        remitted_amount: 2156.00,
        week_period: 'jan 4-jan 10',
        reference_number: 'REF002-250108'
      },
      {
        rider_code: 'BTR003',
        remit_date: '2025-01-08',
        daily_sales: 1650.00,
        commission_amount: 33.00,
        remitted_amount: 1617.00,
        week_period: 'jan 4-jan 10',
        reference_number: 'REF003-250108'
      },
      {
        rider_code: 'BTR004',
        remit_date: '2025-01-08',
        daily_sales: 1836.00,
        commission_amount: 36.72,
        remitted_amount: 1799.28,
        week_period: 'jan 4-jan 10',
        reference_number: 'REF004-250108'
      },
      {
        rider_code: 'BTR005',
        remit_date: '2025-01-08',
        daily_sales: 1350.00,
        commission_amount: 27.00,
        remitted_amount: 1323.00,
        week_period: 'jan 4-jan 10',
        reference_number: 'REF005-250108'
      }
    ];
    
    for (const sale of salesData) {
      // First get rider ID
      const riderResult = await client.query(
        'SELECT id FROM bts_riders WHERE rider_code = $1',
        [sale.rider_code]
      );
      
      if (riderResult.rows.length > 0) {
        const riderId = riderResult.rows[0].id;
        
        await client.query(`
          INSERT INTO bts_sales_remittance (
            rider_id, remit_date, daily_sales, commission_amount, 
            remitted_amount, week_period, reference_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          riderId, sale.remit_date, sale.daily_sales, 
          sale.commission_amount, sale.remitted_amount,
          sale.week_period, sale.reference_number
        ]);
      }
    }
    
    // Seed Attendance Data - Based on actual BTS shift patterns
    console.log('⏰ Seeding Attendance Data...');
    
    const attendanceData = [
      {
        rider_code: 'BTR001',
        attendance_date: '2025-01-08',
        shift_type: 'OPENING',
        hours_worked: 8.0,
        check_in_time: '08:00',
        check_out_time: '16:00'
      },
      {
        rider_code: 'BTR002', 
        attendance_date: '2025-01-08',
        shift_type: 'CLOSING',
        hours_worked: 8.0,
        overtime_hours: 2.0,
        check_in_time: '14:00',
        check_out_time: '24:00'
      },
      {
        rider_code: 'BTR003',
        attendance_date: '2025-01-08',
        shift_type: 'HALFDAY',
        hours_worked: 5.0,
        check_in_time: '08:00',
        check_out_time: '13:00'
      },
      {
        rider_code: 'BTR004',
        attendance_date: '2025-01-08',
        shift_type: 'OTC',
        hours_worked: 11.0,
        overtime_hours: 3.0,
        check_in_time: '09:00',
        check_out_time: '20:00'
      }
    ];
    
    for (const attendance of attendanceData) {
      const riderResult = await client.query(
        'SELECT id FROM bts_riders WHERE rider_code = $1',
        [attendance.rider_code]
      );
      
      if (riderResult.rows.length > 0) {
        const riderId = riderResult.rows[0].id;
        
        await client.query(`
          INSERT INTO bts_attendance (
            employee_id, employee_type, attendance_date, shift_type,
            hours_worked, overtime_hours, check_in_time, check_out_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [
          riderId, 'rider', attendance.attendance_date, attendance.shift_type,
          attendance.hours_worked, attendance.overtime_hours || 0,
          attendance.check_in_time, attendance.check_out_time
        ]);
      }
    }
    
    // Seed Incentive Data - Based on bi-weekly cycles from BTS data
    console.log('🎯 Seeding Incentive Data...');
    
    const incentiveData = [
      {
        rider_code: 'BTR001',
        incentive_period: 'JAN 1- JAN 15',
        sales_target: 15000.00,
        sales_achieved: 16500.00,
        target_percentage: 110.00,
        incentive_amount: 750.00,
        raffle_entries: 3
      },
      {
        rider_code: 'BTR002',
        incentive_period: 'JAN 1- JAN 15',
        sales_target: 15000.00,
        sales_achieved: 18200.00,
        target_percentage: 121.33,
        incentive_amount: 950.00,
        raffle_entries: 4,
        raffle_won: true,
        raffle_prize: 'Gift Card ₱500'
      }
    ];
    
    for (const incentive of incentiveData) {
      const riderResult = await client.query(
        'SELECT id FROM bts_riders WHERE rider_code = $1',
        [incentive.rider_code]
      );
      
      if (riderResult.rows.length > 0) {
        const riderId = riderResult.rows[0].id;
        
        await client.query(`
          INSERT INTO bts_incentives (
            rider_id, incentive_period, sales_target, sales_achieved,
            target_percentage, incentive_amount, raffle_entries, 
            raffle_won, raffle_prize
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING  
        `, [
          riderId, incentive.incentive_period, incentive.sales_target,
          incentive.sales_achieved, incentive.target_percentage,
          incentive.incentive_amount, incentive.raffle_entries,
          incentive.raffle_won || false, incentive.raffle_prize || null
        ]);
      }
    }
    
    // Seed Audit Report Data
    console.log('📊 Seeding Audit Reports...');
    
    await client.query(`
      INSERT INTO bts_audit_reports (
        report_type, report_period, total_sales, declared_sales,
        undeclared_sales, discrepancy_amount, audit_date, audit_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      'MONTHLY_AUDIT', 'JANUARY 2025', 8886.00, 8886.00,
      0.00, 0.00, '2025-01-31',
      'Monthly audit completed successfully. All remittances reconciled.'
    ]);
    
    client.release();
    
    console.log('✅ BTS Data Seeding Complete!');
    console.log('📈 Summary:');
    console.log('  - 5 Riders created');
    console.log('  - 5 Sales remittance records');
    console.log('  - 4 Attendance records');
    console.log('  - 2 Incentive records');  
    console.log('  - 1 Audit report');
    console.log('  - Total Sales: ₱8,886.00 (matching BTS data)');
    
  } catch (error) {
    console.error('❌ Error seeding BTS data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seeding
seedBtsData().catch(console.error);