Use rpcauth.py to generate a password and hash. Put the values in .env. Fill in EXTERNALIP if you want other lightning users to create channels with you. Set RPCUSER if you want the bitcoin rpc username to be different from "lnd". Set ALIAS to name your node (maximum of 32 characters).
```
ALIAS=myname
RPCUSER=lnd
RPCAUTH=lnd:123$567890abcdef
RPCPASS=secret
EXTERNALIP=1.2.3.4
PRUNE=550
TLSEXTRADOMAIN=home-sweet-home.dynalias.com
```
