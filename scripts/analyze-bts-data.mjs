import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to analyze BTS Excel spreadsheet
function analyzeBTSData() {
  try {
    const filePath = path.join(__dirname, '../attached_assets/Audit_Sales Report-4_1756476715757.xlsx');
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    console.log('📊 BTS SPREADSHEET ANALYSIS');
    console.log('==========================');
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`\n📋 Found ${sheetNames.length} sheets:`);
    sheetNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    const analysisData = {
      sheets: {},
      summary: {
        totalSheets: sheetNames.length,
        dataStructures: {},
        businessRules: [],
        seedData: {}
      }
    };
    
    // Analyze each sheet
    sheetNames.forEach(sheetName => {
      console.log(`\n🔍 ANALYZING SHEET: ${sheetName}`);
      console.log('=' + '='.repeat(sheetName.length + 18));
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        console.log('⚠️  Empty sheet');
        return;
      }
      
      // Get headers (first row)
      const headers = jsonData[0] || [];
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
      
      console.log(`📈 Rows: ${dataRows.length} | Columns: ${headers.length}`);
      console.log('🏷️  Headers:', headers.join(' | '));
      
      // Sample data (first 3 rows)
      console.log('\n📄 Sample Data:');
      dataRows.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, row.slice(0, 5).map(cell => cell || 'null').join(' | '));
      });
      
      // Identify data patterns
      const patterns = analyzeDataPatterns(headers, dataRows);
      console.log('\n🔍 Data Patterns:');
      Object.entries(patterns).slice(0, 5).forEach(([key, value]) => {
        console.log(`  ${key}: ${value.type} (${value.uniqueValues} unique values)`);
      });
      
      analysisData.sheets[sheetName] = {
        headers,
        rowCount: dataRows.length,
        sampleData: dataRows.slice(0, 5),
        patterns,
        dataTypes: analyzeColumnTypes(headers, dataRows)
      };
    });
    
    // Save analysis to JSON for further processing
    fs.writeFileSync(
      path.join(__dirname, '../bts-analysis-results.json'), 
      JSON.stringify(analysisData, null, 2)
    );
    
    console.log('\n✅ Analysis completed! Results saved to bts-analysis-results.json');
    
    return analysisData;
    
  } catch (error) {
    console.error('❌ Error analyzing BTS data:', error.message);
    throw error;
  }
}

// Analyze data patterns in columns
function analyzeDataPatterns(headers, rows) {
  const patterns = {};
  
  headers.forEach((header, colIndex) => {
    // Handle numeric headers (like dates as numbers)
    const headerStr = header ? header.toString() : `Column_${colIndex}`;
    const columnData = rows.map(row => row[colIndex]).filter(cell => cell !== undefined && cell !== '');
    
    if (columnData.length === 0) return;
    
    // Detect patterns
    patterns[headerStr] = {
      type: detectColumnType(columnData),
      uniqueValues: [...new Set(columnData)].length,
      sampleValues: columnData.slice(0, 5),
      hasNulls: columnData.length < rows.length
    };
    
    // Business logic detection
    const headerLower = headerStr.toLowerCase();
    if (headerLower.includes('price') || headerLower.includes('amount') || headerLower.includes('remit') || headerLower.includes('total')) {
      patterns[headerStr].businessType = 'currency';
    } else if (headerLower.includes('date') || headerLower.includes('time') || /^\d{5}$/.test(headerStr)) {
      patterns[headerStr].businessType = 'datetime';
    } else if (headerLower.includes('status') || headerLower.includes('attendance')) {
      patterns[headerStr].businessType = 'status';
      patterns[headerStr].statusValues = [...new Set(columnData)];
    } else if (headerLower.includes('id') || headerLower.includes('rider')) {
      patterns[headerStr].businessType = 'identifier';
    }
  });
  
  return patterns;
}

// Detect column data type
function detectColumnType(data) {
  const sample = data.slice(0, 10);
  
  // Check if all are numbers
  if (sample.every(val => !isNaN(val) && val !== '')) {
    return 'number';
  }
  
  // Check if dates
  if (sample.some(val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.toString().match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
  })) {
    return 'date';
  }
  
  // Check if boolean-like
  if (sample.every(val => ['true', 'false', 'yes', 'no', '1', '0', 'active', 'inactive'].includes(val.toString().toLowerCase()))) {
    return 'boolean';
  }
  
  return 'text';
}

// Analyze column data types for database schema
function analyzeColumnTypes(headers, rows) {
  const types = {};
  
  headers.forEach((header, colIndex) => {
    const columnData = rows.map(row => row[colIndex]).filter(cell => cell !== undefined && cell !== '');
    
    if (columnData.length === 0) {
      types[header] = 'text';
      return;
    }
    
    const maxLength = Math.max(...columnData.map(val => val.toString().length));
    const type = detectColumnType(columnData);
    
    types[header] = {
      sqlType: type === 'number' ? 'decimal' : type === 'date' ? 'timestamp' : 'varchar',
      maxLength: type === 'text' ? Math.max(maxLength, 255) : null,
      nullable: columnData.length < rows.length,
      suggested: suggestDatabaseType(header, type, columnData)
    };
  });
  
  return types;
}

// Suggest appropriate database column type
function suggestDatabaseType(header, dataType, sampleData) {
  const headerLower = header.toString().toLowerCase();
  
  if (headerLower.includes('id') && dataType === 'number') {
    return 'integer PRIMARY KEY';
  } else if (headerLower.includes('email')) {
    return 'varchar(255) UNIQUE';
  } else if (headerLower.includes('phone')) {
    return 'varchar(20)';
  } else if (headerLower.includes('price') || headerLower.includes('amount')) {
    return 'decimal(10,2)';
  } else if (headerLower.includes('date') || headerLower.includes('time')) {
    return 'timestamp';
  } else if (dataType === 'number') {
    const hasDecimals = sampleData.some(val => val.toString().includes('.'));
    return hasDecimals ? 'decimal(10,2)' : 'integer';
  }
  
  return dataType === 'text' ? 'varchar(255)' : dataType;
}

// Run the analysis
analyzeBTSData();

export { analyzeBTSData };