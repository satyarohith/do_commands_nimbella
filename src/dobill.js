// jshint esversion: 9

// This code is from: https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
// it allows us to do a promise https request without any dependencies

const getContent = function(url, headers) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    const request = require('https').get(url, {headers}, response => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(
          new Error('Failed to load page, status code: ' + response.statusCode)
        );
      }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', chunk => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', err => reject(err));
  });
};

/**
 * Calculates the difference between date1 and date2 in hours.
 * Or calculates the difference between Date.now() and date1 when date2 is not provided.
 * @param {Date} date1 - A valid minuend date object.
 * @param {Date} [date2] - A valid subtrahend date object.
 */
const calcHours = (date1, date2) => {
  if (!date2) {
    return Math.ceil(Math.abs(Date.now() - date1) / 36e5);
  }

  return Math.ceil(Math.abs(date1 - date2) / 36e5);
};

/**
 * Calculates the difference between date1 and date2 in weeks.
 * Or calculates the difference between Date.now() and date1 when date2 is not provided.
 * @param {Date} date1 - A valid minuend date object.
 * @param {Date} [date2] - A valid subtrahend date object.
 */
const calcWeeks = (date1, date2) => {
  if (!date2) {
    return Math.ceil(Math.abs(Date.now() - date1) / 6048e5);
  }

  return Math.ceil(Math.abs(date1 - date2) / 6048e5);
};

/**
 * Calculates the cost incurred for running all the droplets under an account.
 * @param {array} droplets - An array containing all the droplets under an account.
 */
function calcDropletsCost(droplets = []) {
  let currentCost = 0;
  let projectedCost = 0;
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );

  for (let i = 0; i < droplets.length; i++) {
    const dropletCreatedDate = new Date(droplets[i].created_at);
    // Hourly price of the droplet.
    const hourlyPrice = droplets[i].size.price_hourly;
    let hoursRun = 0;

    // If the droplet is created after 1st of a month, then calculate price based on the created date.
    if (dropletCreatedDate > firstOfThisMonth) {
      hoursRun = calcHours(dropletCreatedDate);
      // Total hours from the creation of droplet to the end of the month.
      let projectedHours = calcHours(firstOfNextMonth, dropletCreatedDate);
      projectedHours = projectedHours < 672 ? projectedHours : 672;
      projectedCost += Number((projectedHours * hourlyPrice).toFixed(2));
    } else {
      hoursRun = calcHours(firstOfThisMonth);
      projectedCost += Number((672 * hourlyPrice).toFixed(2));
    }

    // During billing, DigitalOcean caps the number of hours ran to 672.
    hoursRun = hoursRun > 672 ? 672 : hoursRun;
    currentCost += Number((hoursRun * hourlyPrice).toFixed(2));
  }

  return {current: currentCost, projected: projectedCost};
}

function calcDBCosts(databases = []) {
  // DigitalOcean doesn't provide hourly rates of database clusters via API, so we need to hardcode them.
  const dbPriceIndex = {
    'db-s-1vcpu-1gb': {1: 0.022},
    'db-s-1vcpu-2gb': {1: 0.045, 2: 0.074, 3: 0.104},
    'db-s-2vcpu-4gb': {1: 0.089, 2: 0.149, 3: 0.208},
    'db-s-4vcpu-8gb': {1: 0.179, 2: 0.298, 3: 0.417},
    'db-s-6vcpu-16gb': {1: 0.357, 2: 0.595, 3: 0.833},
    'db-s-8vcpu-32gb': {1: 0.714, 2: 1.19, 3: 1.667},
    'db-s-16vcpu-64gb': {1: 2.381, 2: 3.333}
  };

  let currentCost = 0;
  let projectedCost = 0;
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );

  for (let i = 0; i < databases.length; i++) {
    let hoursRun = 0;
    // Retrieve the hourly price based on size slug and number of nodes running.
    const hourlyPrice = dbPriceIndex[databases[i].size][databases[i].num_nodes];
    const databaseCreatedDate = new Date(databases[i].created_at);
    // If the database cluster is created after 1st of a month, then calculate price based on the created date.
    if (databaseCreatedDate > firstOfThisMonth) {
      hoursRun = calcHours(databaseCreatedDate);
      // Total hours from the creation of db to the end of the month.
      let projectedHours = calcHours(firstOfNextMonth, databaseCreatedDate);
      projectedHours = projectedHours < 672 ? projectedHours : 672;
      projectedCost += Number((projectedHours * hourlyPrice).toFixed(2));
    } else {
      hoursRun = calcHours(firstOfThisMonth);
      projectedCost += Number((672 * hourlyPrice).toFixed(2));
    }

    // During billing, DigitalOcean caps the number of hours ran to 672.
    hoursRun = hoursRun > 672 ? 672 : hoursRun;
    currentCost += Number((hoursRun * hourlyPrice).toFixed(2));
  }

  return {current: currentCost, projected: projectedCost};
}

function calcVolumesCost(volumes = []) {
  let currentCost = 0;
  let projectedCost = 0;
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  for (let i = 0; i < volumes.length; i++) {
    let hoursRun = 0;
    // DO charges $0.10/GB per month (672 hours). So calculate an approximate hourly price based on it.
    const hourlyPrice = (volumes[i].size_gigabytes * 0.1) / 672;
    const volumeCreatedDate = new Date(volumes[i].created_at);
    // If the volume is created after 1st of a month, then calculate price based on the created date.
    if (volumeCreatedDate > firstOfThisMonth) {
      hoursRun = calcHours(volumeCreatedDate);
    } else {
      hoursRun = calcHours(firstOfThisMonth);
    }

    // During billing, DigitalOcean caps the number of hours ran to 672.
    hoursRun = hoursRun > 672 ? 672 : hoursRun;

    currentCost += Number((hoursRun * hourlyPrice).toFixed(2));
    projectedCost += Number((672 * hourlyPrice).toFixed(2));
  }

  return {current: currentCost, projected: projectedCost};
}

function calcSnapshotsCost(snapshots = []) {
  let currentCost = 0;
  let projectedCost = 0;
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  for (let i = 0; i < snapshots.length; i++) {
    let hoursRun = 0;
    // DO charges $0.05/GB per month (672 hours) for snapshots.
    const hourlyPrice = (snapshots[i].size_gigabytes * 0.05) / 672;
    const volumeCreatedDate = new Date(snapshots[i].created_at);
    // If the volume is created after 1st of a month, then calculate price based on the created date.
    if (volumeCreatedDate > firstOfThisMonth) {
      hoursRun = calcHours(volumeCreatedDate);
    } else {
      hoursRun = calcHours(firstOfThisMonth);
    }

    // During billing, DigitalOcean caps the number of hours ran to 672.
    hoursRun = hoursRun > 672 ? 672 : hoursRun;

    currentCost += Number((hoursRun * hourlyPrice).toFixed(2));
    projectedCost += Number((672 * hourlyPrice).toFixed(2));
  }

  return {current: currentCost, projected: projectedCost};
}

function calcBackupsCost(droplets = []) {
  let currentCost = 0;
  let projectedCost = 0;
  const today = new Date();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  for (let i = 0; i < droplets.length; i++) {
    if (droplets[i].features.includes('backups')) {
      const dropletCreatedDate = new Date(droplets[i].created_at);
      const hourlyPriceOfDroplet = droplets[i].size.price_hourly;
      // Each backup costs 5% of the droplet price. They're taken 4 times a month. So at max, they cost 20% of the droplet price.
      const backupPrice = ((hourlyPriceOfDroplet * 672) / 100) * 5;
      let numberOfBackups = 0;

      // If the droplet is created after 1st of a month, then calculate number of backups based on the creation date.
      if (dropletCreatedDate > firstOfThisMonth) {
        numberOfBackups = calcWeeks(dropletCreatedDate);
      } else {
        numberOfBackups = calcWeeks(firstOfThisMonth);
      }

      numberOfBackups = numberOfBackups > 4 ? 4 : numberOfBackups;

      currentCost += Number((numberOfBackups * backupPrice).toFixed(2));
      projectedCost += Number((4 * backupPrice).toFixed(2));
    }
  }

  return {current: currentCost, projected: projectedCost};
}

async function _command(params, commandText, secrets = {}) {
  const {digitaloceanApiKey} = secrets;
  if (!digitaloceanApiKey) {
    return {
      text:
        'You need `digitaloceanApiKey` secret to run this command. Create one by running `/nc secret_create`.'
    };
  }

  let result = '';
  let error = '';
  const BASE_URL = 'https://api.digitalocean.com/v2';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${digitaloceanApiKey}`
  };

  try {
    const {droplets} = JSON.parse(
      await getContent(BASE_URL + '/droplets?per_page=50', headers)
    );
    const {databases} = JSON.parse(
      await getContent(BASE_URL + '/databases?per_page=50', headers)
    );
    const {volumes} = JSON.parse(
      await getContent(BASE_URL + '/volumes?per_page=50', headers)
    );
    const {snapshots} = JSON.parse(
      await getContent(BASE_URL + '/snapshots?per_page=100', headers)
    );

    const dropletsCost = calcDropletsCost(droplets);
    const databasesCost = calcDBCosts(databases);
    const volumesCost = calcVolumesCost(volumes);
    const snapshotsCost = calcSnapshotsCost(snapshots);
    const backupsCost = calcBackupsCost(droplets);

    const totalCurrentCosts = (
      dropletsCost.current +
      databasesCost.current +
      volumesCost.current +
      snapshotsCost.current +
      backupsCost.current
    ).toFixed(2);
    const totalProjectedCosts = (
      dropletsCost.projected +
      databasesCost.projected +
      volumesCost.projected +
      snapshotsCost.projected +
      backupsCost.projected
    ).toFixed(2);

    result = `
    Total Costs so far: $${totalCurrentCosts}\nProjected Costs for this month: $${totalProjectedCosts}
    *Droplets*
     Current: $${dropletsCost.current.toFixed(2)}
     Projected: $${dropletsCost.projected.toFixed(2)}
    *Databases*
     Current: $${databasesCost.current.toFixed(2)}
     Projected: $${databasesCost.projected.toFixed(2)}
    *Block Storage*
     Current: $${volumesCost.current.toFixed(2)}
     Projected: $${volumesCost.projected.toFixed(2)}
    *Snapshots*
     Current: $${snapshotsCost.current.toFixed(2)}
     Projected: $${snapshotsCost.projected.toFixed(2)}
    *Backups*
     Current: $${backupsCost.current.toFixed(2)}
     Projected: $${backupsCost.projected.toFixed(2)}
    *Note*: It only calculates costs of currently active resources.
    `;
  } catch (err) {
    error = `*ERROR:* ${err.message}`;
  }

  return {response_type: 'in_channel', text: error ? error : result};
}

const main = async ({__secrets = {}, commandText, ...params}) => ({
  body: await _command(params, commandText, __secrets)
});
module.exports = main;
