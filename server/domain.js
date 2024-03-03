const DigitalOcean = require("digitalocean");

const client = DigitalOcean.client('dop_v1_ded81f54b889049423b1a258315bc6f83bc783ad4da209e527263abe3c245278');

const addDomain = (domainname) => {
  const domainName = "deployrepos.com"; // Replace with your domain name
  const subdomain = domainname; // Replace with your desired subdomain
  const ipAddress = "64.227.158.72"; // Replace with the IP address of your server

  const domainRecordData = {
    type: "A",
    name: subdomain,
    data: ipAddress,
  };

  client.domains.createRecord(domainName, domainRecordData)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.error(error);
    });
};

module.exports = addDomain;
