# Allowance

My wife and I like to give my kids allowance and rewards for doing certain chores. We rarely use cash, and so we usually don't have cash available to give the kids. We try to remember the IOUs, but the kids don't trust us. The kids are pretty good at confusing us too, so we don't trust them. Our bank does not offer accounts for kids, and most kid-oriented financial products have pretty high monthly fees. [Step](https://step.com/) does offer an excellent no-fee bank account and credit card product for kids, but mine are a little too young for it. [Greenlight](https://www.greenlight.com/) is another interesting product for allowances. It has a chore to-do list, and it gives each child a debit card, unfortunately it also gives the parents a monthly fee. Right now, allowance actually seems like a decent use-case for cryptocurrency in my family.

We will start our cryptocurrency journey at the beginning: with Bitcoin. The kids and their friends have heard of it. I have read the original Bitcoin papers so I have some chance of explaining something about how it works. I hope that these factors will make Bitcoin allowance be more relatable and relevant to our family. 

There are a couple of problems to get started. First, Bitcoin is too slow. Kids are pretty impatient. Waiting 30 minutes for a transaction confirmation just does not make sense. The second problem is that fees are sometimes high. Right now, it costs about 10 cents for a Bitcoin transaction, but the cost is sometimes as high as $20. So the Bitcoin fee is generally too high for sending a dollar at a time. The Bitcoin ecosystem has a solution for these problems: the [Lightning Network](https://lightning.network/).

So begins a new project. The main goal is to create a digital solution for accounting for small amounts of money between parents and kids. Everyone needs to have some ability to spend the money that they have, which rules out simple spreadsheet accounting. Transactions should be pretty quick. In the spirit of trust-minimized systems, the solution should be local. We will avoid using a commercial cloud-hosted service, especially one that would require a monthly fee. If possible, the solution will run on my spare Raspberry Pi 2. We will give the Lightning Network a try, to see if it works for our family allowances.

## The Lightning Network

The Lightning Network is a peer-to-peer payment network that allows participants to send and receive payments. It is a cooperative approach to reducing the cost and latency of Bitcoin transactions. The Lightning Network uses a _flow model_, which contrasts with the _broadcast model_ used in Bitcoin and Ethereum use a _broadcast model_. The network has been around for a few years, and in 2021 it gained in notoriety because of attention by [Jack Dorsey and twitter](https://blog.twitter.com/en_us/topics/product/2021/bringing-tips-to-everyone), and also because of playing a role in El Salvador's Bitcoin experiment.

In Lightning Network, payments flow through a graph of connections. The payment is not handled by the network at large, only the nodes along the path between the two transacting parties. Channels are linked to the Bitcoin blockchain via [contracts](https://developer.bitcoin.org/devguide/contracts.html). Any number of transactions can be sent through the channel, but only two blockchain transactions are needed per channel. One transaction opens the channel, and a second one closes it. The flow model allows transactions to settle much faster with very low fees. On the other hand, it requires nodes to be constantly online in order to transmit payments, guard against malicious channel closes and handle channel open/close message.

The need for each node to be constant online and active makes Lightning Network rather awkward to use. Running a Lightning Network node requires attention to disaster recovery and high availability concerns that are not present in blockchain nodes.  

## Create the Node

I built this project using a Raspberry Pi 2, which I happened to have leftover and unused from an earlier project. The device has just 1 GiB of RAM, but this turns out to be enough to run a Bitcoin Core node and a Lightning Network node.

I chose to use the most widely used server for Lightning Network, [lnd](https://github.com/lightningnetwork/lnd) by [Lightning Labs](https://lightning.engineering/). The lnd service depends on a Bitcoin full node. I used [Bitcoin Core](https://bitcoincore.org/). I also included a web interface [Ride the Lightning](https://github.com/Ride-The-Lightning/RTL), for ease of use. Since this thing is holding money for me, backups are critical. The lnd server has a built-in feature to back-up critical channel data. I used [syncthing](https://syncthing.net/) to replicate channel backup files to other devices.

### Raspberry Pi

To keep things simple, I use the SD Card for all storage. Most guides recommend a SSD. Running from the SD Card keeps the project simple. When the SD Card quits, it should be easy enough to rebuild the system from this docker-compose configuration and the backups. Note that a [Raspberry Pi 2 can use a maximum 256 GiB SD Card.](https://github.com/raspberrypi/documentation/pull/1136) I purchased a [SanDisk Extreme Pro](https://www.amazon.com/gp/product/B07G3H5RBT) for this project, costing $23.10. I chose the SD Card based on [Tom's Hardware review](https://www.tomshardware.com/best-picks/raspberry-pi-microsd-cards).

#### Raspberry Pi OS

If you are starting with a fresh SD Card, here is how to install the Raspberry PI Operating System:

1. Download and install the Raspberry Pi Imager from [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Install Raspberry Pi OS Lite (32-bit) to get the operating system without the desktop environment. We do not need the desktop, since the project will be a headless server.
3. Enable the ssh daemon by creating a file name "ssh" in the root directory. To do this using a Mac, first mount the newly created disk. Run `touch /Volumes/boot/ssh` to create the file. When the "ssh" file is present in the root directory of the boot partition, Raspberry Pi OS starts the ssh daemon when it boots. Finally, eject the disk.
4. Install the SD Card in the Raspberry Pi. Connect it to the network and boot it up.
5. Watch out! Now your Raspberry Pi can accept remote login but has the default password. You can log into it by running `ssh pi@raspberrypi`.
6. Change to a secure password by running `passwd`.
7. [Install fail2ban](https://www.raspberrypi.com/documentation/computers/configuration.html#installing-fail2ban) to prevent brute-force attacks on your password login.
8. Install git:
    ```
    sudo apt install git
    ```

### Docker

This repo gives a docker-compose file for running a Lightning Network node using the Lightning Labs lnd server and Bitcoin Core. The configuration is meant for Raspberry Pi, but works on other platforms. I use the same docker-compose file on a Mac Mini. To get started, Docker and docker-compose must be installed on the system.

#### Raspberry Pi Docker

To install Docker on Raspberry Pi OS:

1. Download and run the installer.
   ```shell
   curl -fsSL https://get.docker.com | sh
   ```
2. Allow the default pi user to run docker commands.
   ```shell
   sudo usermod -aG docker pi
   ```
3. Restart the system, so that the user modification takes full effect.

Next, [install docker-compose](https://docs.docker.com/compose/install/). On Raspberry Pi OS, the steps are:

1. Download the docker-compose program.
   ```shell
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-linux-armv7" -o /usr/local/bin/docker-compose
   ```
2. Make it executable.
   ```shell
   sudo chmod +x /usr/local/bin/docker-compose
   ```
3. Check that it works. The following command should show "Docker Compose version v2.2.2".
   ```shell
   docker-compose --version
   ```
4. Configure docker to start when the system boots up.
   ```shell
   sudo systemctl enable docker
   ```

#### MacOS Docker

To install Docker on MacOS, just [download and install Docker Desktop.](docs.docker.com/desktop/mac/install/). Open the dmg disk image and drag the Docker app to the dock. Run the Docker app, for example open spotlight and search for Docker. Accept the terms and install. Docker Desktop includes docker-compose.

### Start Services

The docker-compose file needs to be configured by a `.env` file. The "genenv.js" script generates the file. Once the Rasperry Pi is setup with Docker, run `genenv.js` to generate the default `.env` file:
1. Get this repository.
   ```shell
   git clone https://github.com/joshuanapoli/allowance.git 
   ```
2. Run genenv to build a default configuration file.
   ```shell
   docker run -it --rm -v "$PWD":/usr/src/app -w /usr/src/app node:14 node genenv.js
   ```
3. Edit the `.env`. At a minmimum, pick an alias for your Lightning Network node.
   ```shell
   nano .env
   ```

If you have run initial block sync on a different computer, copy the files from the other computer to the Raspberry Pi using the following command:
```shell
scp -r ./lnd pi@raspberrypi:~/allowance/lnd
```

### Bitcoin Core

Bitcoin Core does not have an official Docker image. I chose to use [ruimarinho/bitcoin-core](https://hub.docker.com/r/ruimarinho/bitcoin-core), the most popular public image that I coudl find. This docker-compose configures the Bitcoin Core to store its data in the "bitcoin" subdirectory.

#### Initial Block Download

A troublesome aspect of running a Bitcoin full node is the [initial block download](https://bitcoin.org/en/full-node#initial-block-downloadibd). A new node is supposed to download the blockchain from the Bitcoin network and verify all transactions. There are a couple of challenges here. First, the blockchain is over 300 GiB. It does not fit in the Raspberry Pi 2 maximum 256 GiB SD Card size. To reduce disk usage, this project configures Bitcoin core in pruned mode; only the most recent blocks are kept. The second problem is that the Raspberry Pi 2 is just no fast enough to verify all transactions within a reasonable amount of time. My solution was to first synchronize Bitcoin Core on a faster computer (a Mac Mini) and then copy the data to the Raspberry Pi using scp `scp -r ./lnd pi@raspberrypi:~/allowance/lnd`.

### Start Services

Now you are ready to start the services using docker-compose:
```shell
docker-compose up -d
```

The command starts four containers:
- bitcoin-core
- lnd
- rtl
- syncthing

Docker will automatically restart the services if they crash, or if the Raspberry Pi is rebooted.

In my case, lnd takes about 6 minutes to start up.

#### Tailing Logs

You can tail the service logs by running `docker logs --follow SERVICE`. For example, use the following command to follow the lnd logs:
```shell
docker logs --follow lnd
```

### Create Lightning Network Wallet

The lnd service starts up, but does not initially have a wallet. To create a wallet, run the following command:
  ```shell
  docker exec -it lnd lncli create
  ```

Enter a password for the wallet. Your wallet is encrypted with this password. Every time the lnd service is restarted, you will need to unlock the wallet using this password.

When prompted "Do you have an existing cipher seed mnemonic or extended master root key you want to use?", enter "n". The server generates a password and prints out a 24 word cipher seed mnemonic. Print that out and save it somewhere safe. The 24 word cipher seed will be necessary for disaster recovery once your SD Card quits.

#### lnd Docker Image

The official Docker image for lnd does not support 32-bit Raspberry Pi OS. You can use the image that I published, [joshuanapoli/lnd](https://hub.docker.com/r/joshuanapoli/lnd). For reference, I built the package using the following command:
```shell
git clone -b v0.14.1-beta https://github.com/lightninglabs/lnd.git
docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag=joshuanapoli/lnd:v0.14.1-beta --build-arg checkout=v0.14.1-beta .
```

### Ride the Lightning

This project uses the official [Ride the Lightning Docker image](https://hub.docker.com/r/shahanafarooqui/rtl). You should be able to access RTL from your home network at http://raspberrypi:3000. After setting up the node, log into RTL using the default password "password" and set a secure password.

Each time lnd reboots, you will need to enter the lnd wallet password. You can accomplish this via RTL. If the wallet is locked, LND will prompt you for the wallet password.

### Child Nodes

I more or less repeated the above process for each of my two children. I created a total of three nodes: one "family" node and two "child" nodes. I ran my child nodes on our Mac Mini, because I could not run more than one lnd node on my Raspberry Pi 2.

### Networking

Your bitcoin and lnd nodes need to accept incoming network connections, in order to participate in the network. Bitcoin uses port 8333 and lnd uses port 9735. Configure your router to forward external ports to 8333 and 9735 on each of your nodes. You can check that your bitcoin node is externally accessible using [bitnodes check node tool](https://bitnodes.io/#join-the-network). You can find out whether lnd is accessible when by opening a connection to an external node.

### Funding Your Node

The Lightning Node is useless until you create channels. Your family will need to fund one node to set up the initial channels. The minimum channel size is 0.0002 btc (or 20k sats, worth about $10, as of January, 2022). In addition to the channel funds, you will need to additionally provide for about 0.00015 btc (15k sats) sats per channel for possible fees during opening and closing of the channel. I needed two channels to get started: one to each of my children. So I needed a minimum of 0.0007 btc (70k sats) to get started.

To fund your node, log into your RTL node http://raspberrypi:3000 and visit the on-chain page. Generate an address to receive the funds. You will need to obtain the bitcoin somewhere, for example buy it using the [strike.me app](https://strike.me/en/) or the [coinbase exchange](https://www.coinbase.com/). Transfer the bitcoin to the address you generated. The transfer should appear in your RTL unconfirmed on-chain balance within 10 minutes and then in your confirmed balances after about 30 minutes.

### Create Channels

After you create nodes for your children and have funded your own node, you are ready to open channels with your children's nodes. Get your children's node id from the public key dialog on each RTL interface. A channel is opened using an on-chain transaction, and therefore it will take about 30 minutes to confirm.

### Transactions

One the channels are established, you can start sending their allowance money via Lightning Network. Transactions are usually have to be initiated by the receiver of the payment by creating an invoice. It is rather awkward to make your kids send you invoices for their allowance. We can use the lnd CLI to send a spontaneous payment to your children's node. For example, to send 0.00001 btc (1000 sats) use the following command (replacing PUBKEY with the child's node pubkey):
```shell
ssh pi@raspberrypi docker exec lnd lncli sendpayment --amt 1000 --dest PUBKEY --amp
```

The output will look something like this:
```
+------------+--------------+--------------+--------------+-----+----------+--------------------+-------------+
| HTLC_STATE | ATTEMPT_TIME | RESOLVE_TIME | RECEIVER_AMT | FEE | TIMELOCK | CHAN_OUT           | ROUTE       |
+------------+--------------+--------------+--------------+-----+----------+--------------------+-------------+
| SUCCEEDED  |        0.127 |        0.547 | 1000         | 0   |   716983 | 000000000000000000 | node-alias  |
+------------+--------------+--------------+--------------+-----+----------+--------------------+-------------+
```

Spontaneous AMP payments are a new feature. They are not yet supported by Ride the Lightning. For the time being, they can only be entered at the command-line.

Of course, if your kids feel especially motivated to get paid for things, they can generate invoices and send them to you.

### Buying Something

[Bitrefill](https://www.bitrefill.com/buy) is probably the main way pay for something using Lightning Network. The service allows you to buy gift cards for things like Amazon, eBay, Roblox. Ideally, you or your child can generate an invoice on Bitrefill and pay it with your RTL.

For this to work, your family needs at least one Lightning connection to the outside world. If you do not already have a connection (or it does not have enough outbound liquidity), then you can open a channel directly to Bitrefill [03d607f3e69fd032524a867b288216bfab263b6eaee4e07783799a6fe69bb84fac@3.237.23.179:9735](https://www.bitrefill.com/lightning-toplist/?hl=en).

### Backups

The lnd service creates an encrypted backup file every time a channel is updated. In this configuration, the backup files are meant to be copied to other machines using [syncthing](https://syncthing.net/). The docker-compose file installs syncthing on the node and configures the encrypted backup files to be shared. You should install syncthing on at least one other computer and configure the shared directory. Be sure to set "Start at login" in syncthing preferences.

### Monitoring

Lightning Network nodes should not go offline. An offline node obviously cannot route transactions. Moreover, an unscrupulous (or confused) channel partner could theoretically submit a stale commitment transaction. Typically, a node has 24 hours to post the invalidation transaction (the channel's CSV Delay) to punish a peer that posts a stale commitment. If our node is offline, posting the invalidation transaction is impossible, and therefore we could theoretically lose funds from the channel. This scenario is unlikely, but it does show that we need to have monitoring and alerting in place. (Watchtowers are a new alternative, but they are not fully developed yet.) A node that is offline for two weeks will have any open channels labeled as "zombie". Node operators are encouraged to close zombie channels, because they cannot be restored in a disaster recovery scenario.

The [lightning.watch](https://lightning.watch/) is a nice service for monitoring a node. It gives a notification via telegram if the node goes offline. It has a free service level, though it recommends opening a channel which ties up a minimum of 20k sats (about $10, as of January 2022) within Lightning Network.

### Disaster Recovery

Your 24-word seed phrase and SCB channel backup file are used for disaster recovery. You will use them in the following cases:

- **Forgot wallet password:** Your lnd wallet is encrypted. This ensures that someone who obtains a copy of your wallet (for example, by stealing your Raspberry Pi) cannot access your funds. On the other hand, you might also lose access to your funds if you forget the password.
- **SD Card destroyed:** Your SD Card has a finite life. It will eventually fail due to normal read/write wear. It could also be accidentally erased, destroyed by a fire, or lost someone who misunderstands what this Raspberry Pi is for, etc.

To perform disaster recovery:
1. Build a new node. For example, get a new SD Card and follow the instructions above, up to the point of creating the wallet.
2. Initiate wallet creation with `docker exec -it lnd lncli create` and follow the [lnd recovery instructions](https://github.com/lightningnetwork/lnd/blob/master/docs/recovery.md).

Your 24-word seed phrase is essential for any recovery. If you lose your 24-word seed phrase, then create a new node, close your channels on the old node and transfer all of your funds to the new node.

### Umbrel

[Umbrel](https://getumbrel.com/) is the premier distribution for an at-home node. If you only need one Lightning node, already have a 4 GiB Raspberry Pi 4, or can buy [Umbrel's hardware](https://thebitcoinmachines.com/product/machine-with-umbrel/), then you will definitely have an easier time. I used an old Raspberry Pi 2, which cannot run the Umbrel distribution.

# Limitations

The Raspberry Pi 2 only has 1 GiB of memory, which is a pretty severe limitation. I found that it was impossible to run bitcoind plus two lnd instances because the lnd instances keep crashing. For the time being, I'm using my son's Mac Mini to host additional nodes.

Thunderhub is a web interface similar to Ride the Lightning. Its server required more memory than RTL, and could not run alongside the bitcoin and lnd servers.

[Zap](https://www.zaphq.io/) is a nice user-friendly interface for Lightning Network nodes, created by [Jack Mallers](https://twitter.com/JackMallers). Zap is designed to very easily send and receive payments. In contrast RTL is designed to operate a lightning node server, and it isn't very obvious how to correctly use it for payments. The [Zap iOS](https://github.com/LN-Zap/zap-iOS#unmaintained) app works for me, but unfortunately the author warns that the iOS version is no longer maintained. The [Zap Deskop app](https://github.com/LN-Zap/zap-desktop) is also nice, but it has some bugs that prevents it from starting up if the node is already unlocked. The author moved on to found [Strike](https://strike.me/en/). Strike is also a really nice product, but it is a custodial wallet that is subject to Know Your Customer (KYC) regulations. Its [terms of service require users to be at least 18 years old.](https://strike.me/en/legal/tos)

I tried the [Joule](https://lightningjoule.com/) browser extension, but [there is a problem with getting it to work with lnd v0.14.1](https://github.com/joule-labs/joule-extension/issues/291). The author kindly fixed the problem, but I haven't had a chance to try it out again.

# Conclusion

The Lightning Network is kind of an oddball in the cryptocurrency world. It is totally focused on making payments really efficient. It is pretty successful at facilitating fast, cheap and safe payments within its network, but it does not get much attention since it does not have its own price ticker to soar or crash day-to-day.

The Lightning Network does have some accidental complexity with liquidity management. When I put some bitcoin into Lightning Network, I would expect to be able to send it to any connect node. I would also expect to be able to receive a payment from any connected node. But it is not that simple. The network needs enough liquidity along the path between the two nodes to actually form a successful transaction. Liquidity is something that needs to be actively managed. There are various tools to do this: loop back service, swap services, and a liquidity pool market. Maybe financial service providers expect to manage these kinds of things, but the Lightning Network unfortunately seems to expose everyone to this kind of problem. So it randomly takes half an hour of debugging our little network of connections to figure out why we cannot send a small payment.

My day job is with building a SaaS application. It drives me nuts trying to build up this little at-home server. Getting the backup files properly copied is quite frustrating. They're pretty small, and it would be nice to just email them every time they change. But then I have to set up email on the Rapsberry Pi, which leads to various learnings that I do not want to learn about the configuration of Mail Transfer Agents, and how they relate to Docker... It might be in-character for a crypto project to store the backup files using ipfs/Filecoin. However, Filecoin seems to be an aweful product with inscrutable (possibly very high) pricing, and IPFS is too complicated. The whole thing is too resource intesnive to run in my project. Protocol labs (who are behind Filecoin) helpfully run a free service web3.storage which seems to delegate the complexity and cost to their own servers, but the whole situation with "web3" storage just makes no sense.

This project was pretty useful for learning about the Lightning Network. Of course, it would be a lot easier to simply not track allowance money at all, but this is one way to introduce cryptocurrency to my family.

# Liquidity Market

[Lightning Labs](https://https://lightning.engineering/) has some pretty esoteric products for trading and mananging liquidity in the Lightning Network. The need to "manage" liquidity is an odd "bug" with Lightning Network. If I already have a credit on a network, I would expect to be able to spend it on the network. With LN, that's not necessarily the case, and there can be some overhead in rebalancing your liquidity. It seems to me that such balancing should be built into the lnd nodes, but it is not.

Overall, Lightning Network is an oddball in the crypto world. It is designed to make transactions work with lower cost and higher speed, while maintaining most of the key cryptocurrency features to which it is tied. It is pretty successful at this. On the other hand, it is boring. It does not offer a new coin to speculate. Since fees are low, it is nearly impossible to make much money from running a routing node (I earned about 10 sats ($0.004) for routing transactions in the past month). That being said, Lightning Network offers settlement of small transactions with lower fees than any other technology that I could find. It does so while keeping transaction latency as low as centralized payment systems.