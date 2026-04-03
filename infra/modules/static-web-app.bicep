@description('Static Web App name')
param name string

@description('Location for the Static Web App')
param location string

@description('Tags')
param tags object = {}

@description('Storage account name for app settings')
param storageAccountName string

@description('Storage account connection string')
@secure()
param storageAccountConnectionString string

@description('API key for endpoint protection')
@secure()
param apiKey string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
  }
}

resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AZURE_STORAGE_CONNECTION_STRING: storageAccountConnectionString
    AZURE_STORAGE_ACCOUNT_NAME: storageAccountName
    API_KEY: apiKey
  }
}

output name string = staticWebApp.name
output uri string = 'https://${staticWebApp.properties.defaultHostname}'
