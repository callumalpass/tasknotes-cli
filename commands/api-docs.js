const TaskNotesAPI = require('../lib/api');
const { showError, showSuccess, showInfo } = require('../lib/utils');
const ora = require('ora');
const chalk = require('chalk');

async function handler(options = {}) {
  const api = new TaskNotesAPI();
  
  // Test connection
  const spinner = ora('Connecting to TaskNotes...').start();
  const connected = await api.testConnection();
  if (!connected) {
    spinner.fail('Cannot connect to TaskNotes API');
    showError('Make sure TaskNotes is running with API enabled');
    process.exit(1);
  }
  spinner.succeed('Connected to TaskNotes');

  try {
    if (options.ui) {
      // Show Swagger UI URL
      const config = api.config;
      const swaggerUrl = `http://${config.host}:${config.port}/api/docs/ui`;
      
      console.log('\n' + chalk.bold('📖 TaskNotes API Documentation'));
      console.log('─'.repeat(50));
      console.log(`${chalk.cyan('Swagger UI:')} ${chalk.underline(swaggerUrl)}`);
      console.log('\nOpen this URL in your browser to explore the API interactively.');
      
      showInfo(`API documentation UI available at: ${swaggerUrl}`);
    } else {
      // Fetch and display OpenAPI spec
      const specSpinner = ora('Fetching API specification...').start();
      const apiSpec = await api.request('/api/docs');
      specSpinner.succeed('API specification retrieved');

      if (options.json) {
        console.log(JSON.stringify(apiSpec, null, 2));
        return;
      }

      console.log('\n' + chalk.bold('📖 TaskNotes API Specification'));
      console.log('─'.repeat(50));
      
      if (apiSpec.info) {
        console.log(`${chalk.cyan('Title:')} ${apiSpec.info.title}`);
        console.log(`${chalk.cyan('Version:')} ${apiSpec.info.version}`);
        if (apiSpec.info.description) {
          console.log(`${chalk.cyan('Description:')} ${apiSpec.info.description}`);
        }
      }

      if (apiSpec.servers && apiSpec.servers.length > 0) {
        console.log(`${chalk.cyan('Server:')} ${apiSpec.servers[0].url}`);
      }

      if (apiSpec.paths) {
        console.log('\n' + chalk.bold('Available Endpoints:'));
        console.log('─'.repeat(30));
        
        Object.entries(apiSpec.paths).forEach(([path, methods]) => {
          console.log(`\n${chalk.yellow(path)}`);
          Object.entries(methods).forEach(([method, details]) => {
            const methodColor = method === 'get' ? chalk.green : 
                              method === 'post' ? chalk.blue : 
                              method === 'put' ? chalk.yellow : 
                              method === 'delete' ? chalk.red : chalk.gray;
            
            console.log(`  ${methodColor(method.toUpperCase().padEnd(6))} ${details.summary || details.description || ''}`);
          });
        });
      }

      const config = api.config;
      const swaggerUrl = `http://${config.host}:${config.port}/api/docs/ui`;
      console.log('\n' + chalk.bold('💡 Tip:'));
      console.log(`Use ${chalk.cyan('tn api-docs --ui')} to get the Swagger UI URL`);
      console.log(`Or visit: ${chalk.underline(swaggerUrl)}`);
    }

  } catch (error) {
    showError(`Failed to fetch API documentation: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { handler };