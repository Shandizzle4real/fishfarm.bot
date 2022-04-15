require('dotenv').config()
const Web3Feature = require('web3')

// Grab env variables
const rpcUrl = process.env.RPC_URL
const privateKey = process.env.PRIVATE_KEY


// Import web3 wiith the BNB RPC 
const web3 = new Web3Feature(rpcUrl)
const wallet = web3.eth.accounts.wallet.add(privateKey)

// Smart contract address
const BNB_MINER_CONTRACT = "0x8BeA96dBe7C85127A68aD6916949670eB5c45e9c"


// Contract ABI
const BNB_MINER_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"adr","type":"address"},{"indexed":false,"internalType":"uint256","name":"boosted","type":"uint256"}],"name":"RewardsBoosted","type":"event"},{"inputs":[{"internalType":"uint256","name":"eth","type":"uint256"},{"internalType":"uint256","name":"contractBalance","type":"uint256"}],"name":"calculateBuy","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"fish","type":"uint256"}],"name":"calculateSell","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProjectBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProjectStats","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"adr","type":"address"}],"name":"getUserFish","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"adr","type":"address"}],"name":"getUserFishingPower","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"adr","type":"address"}],"name":"getUserNewFish","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"adr","type":"address"}],"name":"getUserRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"adr","type":"address"}],"name":"getUserStats","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"ref","type":"address"}],"name":"hireFishers","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"ref","type":"address"}],"name":"rehireFishers","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"seedMarket","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"sellFish","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]


// Create new object
const bnbMinerContract = new web3.eth.Contract(BNB_MINER_ABI, BNB_MINER_CONTRACT)


let isCompoundingCurrently = false

// This script works with BNB
const symbol = 'AVAX'

// Value to store current miners
let minersBefore

// Create function that can be used to check for compounding oppertunities
const checkOpportunityToCompound = async function(){

    // If the script is currently compounding then do nothing
    if(isCompoundingCurrently) return;

    try{

    // Pause execution until the promise is settled 
    const obtainedRewards = await bnbMinerContract.methods.getUserNewFish(wallet.address).call()


    // Add referral BNB and base BNB mined
    const combinedTotalEggs = parseInt(obtainedRewards)+parseInt(0)

    // Calculate the BNB value
    const salePrice = await bnbMinerContract.methods.calculateSell(combinedTotalEggs.toString()).call()


    // Calculate the final amount of BNB that is mine
    const finalAmount = parseInt(salePrice) 

    // Caluate BNB rewards
    const rewards =  web3.utils.fromWei(finalAmount.toString())

    // Round to 4 dp
    const bnbValue = parseFloat(parseFloat(rewards).toFixed(4))

    // Organise the gas limit and check if we are ready to compound
    const gasLimit = 200000
    const gasPrice = await web3.eth.getGasPrice()

    const txCost = web3.utils.fromWei(gasPrice.toString()) * gasLimit
    
    // We use this to determine what multiple of the tx cost we wanna compound at 
    const multiplierTxCost = 3

    // Since the GAS Limit is higher we don't have to have a multiple of the TXCOST
    const threshold = txCost * multiplierTxCost
    // We can compound now 
    if(bnbValue > threshold){
        // Get the current amount of miners 
        minersBefore = await bnbMinerContract.methods.getUserFish(wallet.address).call()

        console.log(`Ready to compound ${bnbValue} ${symbol}`);
        isCompoundingCurrently = true
        compound(gasLimit, gasPrice)
    } else{
        console.log(`Not ready to compound ${bnbValue} ${symbol} as it's not more than ${threshold} ${symbol}`)
    }

   } catch(error){
       console.log(`Failed to call smart contract, try again! ${error.stack}`);
   }

}

const compound = async function(gasLimit, gasPrice){
    // We want to compound if we get to this point so hit the hatch eggs endpoint.
    try{
        console.log('Invoking hatchEggs');

        const hatchEggsTx = await bnbMinerContract.methods.rehireFishers(wallet.address).send(
        {
            from:wallet.address,
            gas:gasLimit,
            gasPrice:gasPrice,

        })
        console.log(`Compound status: ${hatchEggsTx.status}`)
    }catch(error){
        console.log(`Failed to compound with smart contract, try again! ${error.stack}`);
        isCompoundingCurrently = false
        return
    }

    //Get miners after
    const minersAfter = await bnbMinerContract.methods.getUserFish(wallet.address).call()

    // Now we check for how many miners we have gained
    const minersIncrease = minersAfter - minersBefore

    isCompoundingCurrently = false
    console.log(`Finished Compounding, continue sniffing blockchain...`)
}

checkOpportunityToCompound()
const POLLING_INTERVAL = 240000 // 4 minutes 
// Ping the endpoint when possible
setInterval(async () => { await checkOpportunityToCompound() },POLLING_INTERVAL)



