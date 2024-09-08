const snmp = require("net-snmp");

// Configuration
const community = "public";
const systemOids = [
  "1.3.6.1.2.1.1.1.0", // SNMPv2-MIB::sysDescr.0
  "1.3.6.1.2.1.1.5.0", // SNMPv2-MIB::sysName.0
  "1.3.6.1.2.1.1.6.0", // SNMPv2-MIB::sysLocation.0
  "1.3.6.1.2.1.1.3.0", // SNMPv2-MIB::sysUpTime.0
  "1.3.6.1.2.1.2.1.0", // IF-MIB::ifNumber.0
];

const interfaceOids = [
  "1.3.6.1.2.1.2.2.1.2", // IF-MIB::ifDescr
  "1.3.6.1.2.1.2.2.1.3", // IF-MIB::ifType
  "1.3.6.1.2.1.2.2.1.5", // IF-MIB::ifSpeed
  "1.3.6.1.2.1.2.2.1.8", // IF-MIB::ifOperStatus
  "1.3.6.1.2.1.31.1.1.1.1", // IF-MIB::ifName
  "1.3.6.1.2.1.31.1.1.1.18", // IF-MIB::ifAlias
];

const performanceOids = [
  "1.3.6.1.4.1.2021.11.9.0", // UCD-SNMP-MIB::ssCpuUser
  "1.3.6.1.4.1.2021.11.10.0", // UCD-SNMP-MIB::ssCpuSystem
  "1.3.6.1.4.1.2021.4.5.0", // UCD-SNMP-MIB::memTotalReal
  "1.3.6.1.4.1.2021.4.6.0", // UCD-SNMP-MIB::memAvailReal
];

const diskOids = [
  "1.3.6.1.4.1.2021.9.1.2", // UCD-SNMP-MIB::dskPath
  "1.3.6.1.4.1.2021.9.1.6", // UCD-SNMP-MIB::dskTotal
  "1.3.6.1.4.1.2021.9.1.8", // UCD-SNMP-MIB::dskUsed
];

const trafficOids = [
  "1.3.6.1.2.1.2.2.1.10", // IF-MIB::ifInOctets
  "1.3.6.1.2.1.2.2.1.16", // IF-MIB::ifOutOctets
];

const serviceOids = [
  "1.3.6.1.2.1.25.4.2.1.2", // HOST-RESOURCES-MIB::hrSWRunName
  "1.3.6.1.2.1.25.4.2.1.4", // HOST-RESOURCES-MIB::hrSWRunType
  "1.3.6.1.2.1.25.4.2.1.5", // HOST-RESOURCES-MIB::hrSWRunStatus
];

const oidNames = {
  "1.3.6.1.2.1.1.1.0": "System Description",
  "1.3.6.1.2.1.1.5.0": "System Name",
  "1.3.6.1.2.1.1.6.0": "System Location",
  "1.3.6.1.2.1.1.3.0": "System Uptime",
  "1.3.6.1.2.1.2.1.0": "Number of Interfaces",
  "1.3.6.1.2.1.2.2.1.2": "Interface Description",
  "1.3.6.1.2.1.2.2.1.3": "Interface Type",
  "1.3.6.1.2.1.2.2.1.5": "Interface Speed",
  "1.3.6.1.2.1.2.2.1.8": "Interface Operational Status",
  "1.3.6.1.2.1.31.1.1.1.1": "Interface Name",
  "1.3.6.1.2.1.31.1.1.1.18": "Interface Alias",
  "1.3.6.1.4.1.2021.11.9.0": "CPU User",
  "1.3.6.1.4.1.2021.11.10.0": "CPU System",
  "1.3.6.1.4.1.2021.4.5.0": "Total RAM",
  "1.3.6.1.4.1.2021.4.6.0": "Available RAM",
  "1.3.6.1.4.1.2021.9.1.2": "Disk Path",
  "1.3.6.1.4.1.2021.9.1.6": "Disk Total",
  "1.3.6.1.4.1.2021.9.1.8": "Disk Used",
  "1.3.6.1.2.1.2.2.1.10": "Interface In Octets",
  "1.3.6.1.2.1.2.2.1.16": "Interface Out Octets",
  "1.3.6.1.2.1.25.4.2.1.2": "Service Name",
  "1.3.6.1.2.1.25.4.2.1.4": "Service Type",
  "1.3.6.1.2.1.25.4.2.1.5": "Service Status",
};

// Add this object to explain interface types
const ifTypes = {
  1: "other",
  6: "ethernetCsmacd",
  24: "softwareLoopback",
  131: "tunnel",
  // Add more types as needed
};

// Function to generate IP addresses in the given range
function* generateIPRange(start, end) {
  let [a, b, c, d] = start.split(".").map(Number);
  let [endA, endB, endC, endD] = end.split(".").map(Number);

  while (a <= endA) {
    while (b <= endB) {
      while (c <= endC) {
        while (d <= endD) {
          yield `${a}.${b}.${c}.${d}`;
          if (a === endA && b === endB && c === endC && d === endD) return;
          d++;
        }
        d = 0;
        c++;
      }
      c = 0;
      b++;
    }
    b = 0;
    a++;
  }
}

// Add this at the top of the file
const errors = [];

function scanIP(ip) {
  return new Promise((resolve) => {
    const session = snmp.createSession(ip, community);

    console.log(`Scanning ${ip}:`);

    const results = {
      system: {},
      interfaces: {},
      performance: {},
      disk: {},
      traffic: {},
      services: [],
    };

    function closeSessionAndResolve() {
      if (session) {
        session.close();
      }
      resolve();
    }

    function getSystemInfo() {
      return Promise.all(
        systemOids.map(
          (oid) =>
            new Promise((resolve) => {
              session.get([oid], (error, varbinds) => {
                if (error) {
                  errors.push(
                    `${ip}: Error getting OID ${oid}: ${error.message}`
                  );
                } else if (!varbinds || varbinds.length === 0) {
                  errors.push(`${ip}: No response for OID ${oid}`);
                } else if (snmp.isVarbindError(varbinds[0])) {
                  errors.push(
                    `${ip}: Varbind error for OID ${oid}: ${snmp.varbindError(
                      varbinds[0]
                    )}`
                  );
                } else {
                  let value = varbinds[0].value;
                  if (varbinds[0].type === snmp.ObjectType.OctetString) {
                    value = value.toString();
                  } else if (varbinds[0].type === snmp.ObjectType.TimeTicks) {
                    value = `${Math.floor(value / 8640000)} days, ${new Date(
                      value * 10
                    )
                      .toISOString()
                      .substr(11, 8)}`;
                  }
                  results.system[oid] = value;
                }
                resolve();
              });
            })
        )
      );
    }

    function getInterfaces() {
      const numInterfaces = results.system["1.3.6.1.2.1.2.1.0"] || 0;
      return Promise.all(
        Array.from({ length: numInterfaces }, (_, i) => i + 1).map((ifIndex) =>
          Promise.all(
            interfaceOids.map(
              (oid) =>
                new Promise((resolve) => {
                  const currentOid = `${oid}.${ifIndex}`;
                  session.get([currentOid], (error, varbinds) => {
                    if (error) {
                      errors.push(
                        `${ip}: Error getting OID ${currentOid}: ${error.message}`
                      );
                    } else if (!varbinds || varbinds.length === 0) {
                      errors.push(`${ip}: No response for OID ${currentOid}`);
                    } else if (snmp.isVarbindError(varbinds[0])) {
                      errors.push(
                        `${ip}: Varbind error for OID ${currentOid}: ${snmp.varbindError(
                          varbinds[0]
                        )}`
                      );
                    } else {
                      let value = varbinds[0].value;
                      if (varbinds[0].type === snmp.ObjectType.OctetString) {
                        value = value.toString();
                      }
                      if (!results.interfaces[ifIndex]) {
                        results.interfaces[ifIndex] = {};
                      }
                      results.interfaces[ifIndex][oid] = value;
                    }
                    resolve();
                  });
                })
            )
          )
        )
      );
    }

    function getPerformance() {
      return Promise.all(
        performanceOids.map(
          (oid) =>
            new Promise((resolve) => {
              session.get([oid], (error, varbinds) => {
                if (error) {
                  errors.push(
                    `${ip}: Error getting OID ${oid}: ${error.message}`
                  );
                } else if (!varbinds || varbinds.length === 0) {
                  errors.push(`${ip}: No response for OID ${oid}`);
                } else if (snmp.isVarbindError(varbinds[0])) {
                  errors.push(
                    `${ip}: Varbind error for OID ${oid}: ${snmp.varbindError(
                      varbinds[0]
                    )}`
                  );
                } else {
                  results.performance[oid] = varbinds[0].value;
                }
                resolve();
              });
            })
        )
      );
    }

    function getDisk() {
      return new Promise((resolve) => {
        let index = 1;
        function getDiskInfo() {
          const currentOids = diskOids.map((oid) => `${oid}.${index}`);
          session.get(currentOids, (error, varbinds) => {
            if (error) {
              errors.push(
                `${ip}: Error getting OID ${currentOids.join(", ")}: ${
                  error.message
                }`
              );
              resolve();
            } else if (!varbinds || varbinds.length === 0) {
              resolve();
            } else if (varbinds.some(snmp.isVarbindError)) {
              errors.push(
                `${ip}: Varbind error for OID ${currentOids.join(", ")}`
              );
              resolve();
            } else {
              results.disk[index] = {};
              varbinds.forEach((vb, i) => {
                results.disk[index][diskOids[i]] = vb.value.toString();
              });
              index++;
              getDiskInfo();
            }
          });
        }
        getDiskInfo();
      });
    }

    function getTraffic() {
      const numInterfaces = results.system["1.3.6.1.2.1.2.1.0"] || 0;
      return Promise.all(
        Array.from({ length: numInterfaces }, (_, i) => i + 1).map((ifIndex) =>
          Promise.all(
            trafficOids.map(
              (oid) =>
                new Promise((resolve) => {
                  const currentOid = `${oid}.${ifIndex}`;
                  session.get([currentOid], (error, varbinds) => {
                    if (error) {
                      errors.push(
                        `${ip}: Error getting OID ${currentOid}: ${error.message}`
                      );
                    } else if (!varbinds || varbinds.length === 0) {
                      errors.push(`${ip}: No response for OID ${currentOid}`);
                    } else if (snmp.isVarbindError(varbinds[0])) {
                      errors.push(
                        `${ip}: Varbind error for OID ${currentOid}: ${snmp.varbindError(
                          varbinds[0]
                        )}`
                      );
                    } else {
                      if (!results.traffic[ifIndex]) {
                        results.traffic[ifIndex] = {};
                      }
                      results.traffic[ifIndex][oid] = varbinds[0].value;
                    }
                    resolve();
                  });
                })
            )
          )
        )
      );
    }

    function getServices() {
      return new Promise((resolve) => {
        let index = 1;
        function getServiceInfo() {
          const currentOids = serviceOids.map((oid) => `${oid}.${index}`);
          session.get(currentOids, (error, varbinds) => {
            if (error) {
              errors.push(
                `${ip}: Error getting OID ${currentOids.join(", ")}: ${
                  error.message
                }`
              );
              resolve();
            } else if (!varbinds || varbinds.length === 0) {
              resolve();
            } else if (varbinds.some(snmp.isVarbindError)) {
              errors.push(
                `${ip}: Varbind error for OID ${currentOids.join(", ")}`
              );
              resolve();
            } else {
              const service = {};
              varbinds.forEach((vb, i) => {
                service[serviceOids[i]] = vb.value.toString();
              });
              results.services.push(service);
              index++;
              getServiceInfo();
            }
          });
        }
        getServiceInfo();
      });
    }

    function printResults() {
      console.log(`Results for ${ip}:`);

      console.log("\nSystem Information:");
      for (let oid in results.system) {
        let value = results.system[oid];
        if (oid === "1.3.6.1.2.1.1.3.0") {
          // System Uptime
          const uptime = parseInt(value);
          const days = Math.floor(uptime / (24 * 60 * 60 * 100));
          const hours = Math.floor(
            (uptime % (24 * 60 * 60 * 100)) / (60 * 60 * 100)
          );
          const minutes = Math.floor((uptime % (60 * 60 * 100)) / (60 * 100));
          value = `${days} days, ${hours} hours, ${minutes} minutes`;
        }
        console.log(`${oidNames[oid]}: ${value}`);
      }

      console.log("\nInterfaces:");
      for (let ifIndex in results.interfaces) {
        console.log(`\nInterface ${ifIndex}:`);
        for (let oid in results.interfaces[ifIndex]) {
          let value = results.interfaces[ifIndex][oid];
          if (oid === "1.3.6.1.2.1.2.2.1.5") {
            // Interface Speed
            value = `${(parseInt(value) / 1000000).toFixed(2)} Mbps`;
          } else if (oid === "1.3.6.1.2.1.2.2.1.3") {
            // Interface Type
            const typeNum = parseInt(value);
            value = `${typeNum} (${ifTypes[typeNum] || "Unknown"})`;
          }
          console.log(`  ${oidNames[oid]}: ${value}`);
        }
      }

      console.log("\nPerformance:");
      for (let oid in results.performance) {
        let value = results.performance[oid];
        if (oid.includes("Cpu")) {
          value = `${value}%`;
        } else if (oid.includes("mem")) {
          value = `${(parseInt(value) / 1024 / 1024).toFixed(2)} GB`;
        }
        console.log(`${oidNames[oid]}: ${value}`);
      }

      console.log("\nDisk Usage:");
      for (let index in results.disk) {
        console.log(`\nDisk ${index}:`);
        for (let oid in results.disk[index]) {
          let value = results.disk[index][oid];
          if (oid.includes("Total") || oid.includes("Used")) {
            value = `${(parseInt(value) / 1024 / 1024).toFixed(2)} GB`;
          }
          console.log(`  ${oidNames[oid]}: ${value}`);
        }
      }

      console.log("\nNetwork Traffic:");
      for (let ifIndex in results.traffic) {
        console.log(`\nInterface ${ifIndex}:`);
        for (let oid in results.traffic[ifIndex]) {
          let value = results.traffic[ifIndex][oid];
          value = `${(parseInt(value) / 1024 / 1024).toFixed(2)} MB`;
          console.log(`  ${oidNames[oid]}: ${value}`);
        }
      }

      console.log("\nServices:");
      results.services.forEach((service, index) => {
        console.log(`\nService ${index + 1}:`);
        for (let oid in service) {
          let value = service[oid];
          if (oid === "1.3.6.1.2.1.25.4.2.1.4") {
            // Service Type
            const typeNum = parseInt(value);
            value = `${typeNum} (${
              typeNum === 1
                ? "Unknown"
                : typeNum === 2
                ? "Operating System"
                : typeNum === 3
                ? "Device Driver"
                : typeNum === 4
                ? "Application"
                : "Other"
            })`;
          } else if (oid === "1.3.6.1.2.1.25.4.2.1.5") {
            // Service Status
            const statusNum = parseInt(value);
            value = `${statusNum} (${
              statusNum === 1
                ? "Running"
                : statusNum === 2
                ? "Runnable"
                : statusNum === 3
                ? "Not Runnable"
                : statusNum === 4
                ? "Invalid"
                : "Unknown"
            })`;
          }
          console.log(`  ${oidNames[oid]}: ${value}`);
        }
      });

      closeSessionAndResolve();
    }

    getSystemInfo()
      .then(getInterfaces)
      .then(getPerformance)
      .then(getDisk)
      .then(getTraffic)
      .then(getServices)
      .then(printResults)
      .catch((error) => {
        errors.push(`${ip}: Unexpected error: ${error.message}`);
        closeSessionAndResolve();
      });

    // Set a timeout for the entire operation
    setTimeout(() => {
      errors.push(`${ip}: SNMP operation timed out`);
      closeSessionAndResolve();
    }, 60000); // 60 second timeout
  });
}

// Update the main function to display error summary
async function scanNetwork(start, end) {
  const ipRange = [...generateIPRange(start, end)];
  console.log(`Scanning ${ipRange.length} IP addresses...`);

  await Promise.all(ipRange.map((ip) => scanIP(ip)));

  // Display error summary
  if (errors.length > 0) {
    console.log("\nError Summary:");
    errors.forEach((error) => console.log(error));
  } else {
    console.log("\nNo errors occurred during the scan.");
  }
}

// Run the scan
if (module === require.main) {
  scanNetwork("172.21.8.33", "172.21.8.39").then(() =>
    console.log("Scan complete")
  );
}
