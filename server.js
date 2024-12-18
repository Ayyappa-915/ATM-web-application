const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 8000;

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/databse')
    .then(() => { console.log("connected to mongodb") })
    .catch(error => { console.log("Error", error) });

const account_schema = new mongoose.Schema({
    account_name: String,
    account_number: String,
    phone_number: String,
    amount: Number,
    pin_number: String // Added pin_number to the schema
});
const account_model = mongoose.model('Accounts', account_schema);

const transaction_schema = new mongoose.Schema({
    account_number: String,
    type: String,
    amount: Number,
    Date: { type: Date, default: Date.now }
});
const transaction_model = mongoose.model('Transactions', transaction_schema);

app.post('/registration', (req, res) => {
    const { account_name, account_number, phone_number } = req.body;

    account_model.findOne({ account_number })
        .then((existingAccount) => {
            if (existingAccount) {
                res.json({ msg: 'Account was already registered.', done: true });
                return 0;
            }
            const newAccount = new account_model({ account_name, account_number, phone_number, amount: 0 });
            return newAccount.save();
        })
        .then((savedAccount) => {
            if (savedAccount) {
                res.json({ msg: 'Account was successfully registered.', done: true });
                return 0;
            }
        })
        .catch((error) => {
            console.error(error);
            res.json({ msg: 'Account registration failed.', done: true });
        });
});

app.post('/generate_pin', (req, res) => {
    const { account_name, account_number, pin_number } = req.body;
    account_model.findOne({ account_name, account_number })
        .then((verifying_account) => {
            if (!verifying_account) {
                res.json({ msg: 'Account was Not Found...', done: true });
                return 0;
            }
            if (verifying_account.pin_number) {
                res.json({ msg: 'Pin was already generated', done: true });
                return 0;
            }
            verifying_account.pin_number = pin_number;
            return verifying_account.save();
        })
        .then((updated_account) => {
            if (updated_account) {
                res.json({ msg: 'Pin was Successfully Generated', done: true });
                return 0;
            }
        })
        .catch((error) => {
            console.error(error);
            res.json({ msg: 'Pin Generation was Failed', done: true });
        });
});
app.post('/deposit', (req, res) => {
    const { account_number, pin_number, amount } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        res.json({ msg: 'Invalid deposit amount. Please enter a positive number.', done: false });
        return;
    }
    account_model.findOne({ account_number })
    .then((verifying_account) => {
        if (!verifying_account) {
            res.json({ msg: 'Account was not found...', done: true});
            return null;
        }
            if (!verifying_account.pin_number) {
                res.json({ msg: 'Pin is not generated for this account. Please generate a PIN.', done: true });
                return null;
            }
            if (verifying_account.pin_number !== pin_number) {
                res.json({ msg: 'Incorrect pin. Please enter a valid PIN.', done: false });
                return null;
            }
        verifying_account.amount += parseFloat(amount);
        return verifying_account.save();
        })
        .then((updated_account) => {
            if (!updated_account) return;

            const newTransaction = new transaction_model({
                account_number,
                type: 'deposit',
                amount: parseFloat(amount),
            });
        return newTransaction.save();
        })
        .then((transaction) => {
            if (!transaction) return;
            res.json({ msg: `Amount ${amount} was successfully deposited.`, done: true });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ msg: 'Deposit failed due to an error.', done: true });
        });
});


app.post('/withdraw' , (req,res) =>{
    const {account_number , pin_number , amount} = req.body;
    account_model.findOne( {account_number})
    .then((existing_account) => {
        if(!existing_account) {
            res.json({msg : "Account was not Found..." , done:true});
            return null;
        }
        if(!existing_account.pin_number) {
            res.json({msg:"Pin was not Generated for this Account" , done:true});
            return null;
        }
        if(existing_account.pin_number != pin_number){
            res.json({msg:"Invalid Pin number.Please Enter valid Pin Number" , done:false});
            return null;
        }
        if(existing_account.amount < amount){
            res.json({msg:"Insufficient funds are available..." , done:false});
            return null;
        }
        existing_account.amount = existing_account.amount - amount;
        return existing_account.save()
    })
    .then((updated_account) =>{
        if(!updated_account){ return ;}
        const newTransaction = new transaction_model({
            account_number,
            type : 'Withdraw',
            amount :parseFloat(amount),
        });
        return newTransaction.save();
    })
    .then((transaction) =>{
        if(!transaction) { return ;}
        res.json({msg:`Amount ${amount} was succcesfully withdrawn...`, done:true});
    })
    .catch((error)=>
    {
        res.json({msg:'withdrawl failed due to error',error});
    });
})

app.post('/check_bal' , (req,res) =>{
    const { account_number , pin_number} = req.body;
    account_model.findOne({account_number})
    .then((existing_account)=>{
        if(!existing_account) {
            res.json({msg:"Account was not Found" , done:true});
            return null;
        }
        if(!existing_account.pin_number) {
            res.json({msg:"Pin was not generated For this account" , done:true});
            return null;
        }
        if(existing_account.pin_number != pin_number) {
            res.json({msg:"Ivalid pin number.Please enter valid PIN number", done:false});
            return null;
        }
        if(existing_account.pin_number == pin_number) {
            res.json({msg:`Available Balance amount is ${existing_account.amount }` , done:true});
        }
    })
    .catch((error)=>{
        console.log(error)
        res.json({msg:"Balance Checking is failed due to Error",error});
    });
})

app.post('/change_pin' , (req,res)=>{
    const {account_number , old_pin , new_pin} = req.body;
    account_model.findOne({account_number})
    .then((existing_account) =>{
        if(!existing_account) {
            res.json({msg:"Account was not Found" , done:true});
            return null;
        }
        if(!existing_account.pin_number) {
            res.json({msg:"Pin was not generated For this account" , done:true});
            return null;
        }
        if(existing_account.pin_number != old_pin) {
            res.json({msg:"Ivalid pin number.Please enter valid PIN number", done:false});
            return null;
        }
        if(existing_account.pin_number == new_pin) {
            res.json({msg:"old Pin and New Pin must to be same to change the Pin" ,done:false});
            return null;
        }
        existing_account.pin_number=new_pin;
        return existing_account.save();
    })
    .then((updated_account) =>{
        if(!updated_account) return ;
        res.json({msg:"pin was Succesfully Changed" , done:true});
    })
    .catch((error) =>
    {
        console.log(error);
        res.json({msg:"Pin change was failed due to Error",error});
    });
})

app.post('/transaction',(request,response)=>{
    const {account_number,pin_number} = request.body;
    account_model.findOne({account_number})
    .then((existing_account)=>{
        if(!existing_account){
            response.json({msg:"Account was not Found..." , done:true});
            return null;
        }
        if(!existing_account.pin_number){
            response.json({msg:"Pin was not generated for this account",done:true});
            return null;

        }
        if(existing_account.pin_number != pin_number){
            response.json({msg:"Invalid Pin Number.please Enter valid PIN Number" , done:false});
            return null;
        }
    })
    transaction_model.find({account_number})
    .then((existing_transaction) =>{
        if(!existing_transaction) {
            response.json({msg:"Transaction was Not Started yet..."});
            return null;
        }
        response.json({msg:`The Transaction History for the Account is: \n ${existing_transaction}`, done:true});
    })
    .catch((error)=>
    {
        console.error(error);
        response.json({msg:"Transaction History was failed due to error",error})
    });
})

app.post('/money_transfer', (req, res) => {
    const {rec_acc_no,sen_acc_no,amount,pin_number} = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.json({ msg: 'Invalid amount.', done: false });
    }
    account_model.findOne({ account_number: sen_acc_no })
    .then(sender => {
        if (!sender) {
            return res.json({ msg: 'Sender Account not found.', done: true });
        }
        if (!sender.pin_number || sender.pin_number !== pin_number) {
            return res.json({ msg: 'Invalid PIN for sender.', done: false });
        }
        if (sender.amount < amount) {
            return res.json({ msg: 'Insufficient funds.', done: true });
        }
        return account_model.findOne({ account_number: rec_acc_no })
            .then(receiver => {
                if (!receiver) {
                    return res.json({ msg: 'Receiver Account not found.', done: true });
                }
                sender.amount -= parseFloat(amount);
                receiver.amount += parseFloat(amount);
                return Promise.all([sender.save(), receiver.save()])
                    .then(() => {
                        const senderTransaction = new transaction_model({
                        account_number: sen_acc_no,
                        type: 'Money-Transfer : mode-WITHDRAW',
                        amount: parseFloat(amount),
                        });
                        const receiverTransaction = new transaction_model({
                        account_number: rec_acc_no,
                        type: 'Money-Transfer : mode-DEPOSIT',
                        amount: parseFloat(amount),
                    });
                return Promise.all([senderTransaction.save(), receiverTransaction.save()])
            .then(() => {
                res.json({ msg: `Money ${amount} successfully transferred.`, done: true });
            });
        });
                });
        })
        .catch(error => {
            console.error(error);
            res.json({ msg: 'Money transfer failed due to an error.', error });
        });
});




app.use(express.static(__dirname));
app.use('/css', express.static(path.join(__dirname, 'CSS')));
app.use('/js', express.static(path.join(__dirname, 'JAVASCRIPT')));

app.get('/change_pin', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'change_pin.html'));
});

app.get('/check_bal', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'check_bal.html'));
});

app.get('/deposit', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'deposit.html'));
});

app.get('/generate_pin', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'generate_pin.html'));
});

app.get('/money_transfer', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'money_transfer.html'));
});

app.get('/registration', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'registration.html'));
});

app.get('/transaction', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'transaction.html'));
});

app.get('/withdraw', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'withdraw.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));  
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
