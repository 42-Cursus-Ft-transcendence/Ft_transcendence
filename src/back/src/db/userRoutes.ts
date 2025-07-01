import { FastifyInstance } from "fastify";
import { db } from './db';
import bcrypt from 'bcrypt';
import { error } from "console";
import { resolve } from "path";
import { rejects } from "assert";


function runAsync(sql: string, values: any[]): Promise<number>
{
    return new Promise((resolve, reject) => {
        db.run(sql, values, function(this: { lastID: number; changes: number}, error)
        {
            if(error)
            {
                reject(error);
            }
            else
            {
                resolve(this.lastID);
            }
        });
    });
}

export default async function userRoutes(app: FastifyInstance) 
{
    console.log('🛠️  userRoutes mounted')  
    app.post('/user', async (request, reply) => 
    {
        console.log('>> Reçu POST /user'); 
        // Récupère et valide le body
        const {userName, email, password } = request.body as 
        {
            userName?: string;
            email?: string;
            password?: string;
        }
        if(!userName || !email || !password)
            return (reply.status(400).send({error: 'userName, email and password required'}));

        try
        {
            const hashPass = await bcrypt.hash(password, 10);
            const now = new Date().toString();

            const idUser = await runAsync(
                `INSERT INTO User(userName, email, password, registrationDate, connectionStatus)
                VALUES (?, ?, ?, ?, 0)`,
                [userName, email, hashPass, now]
            )
            return (reply.status(201).send({ idUser }));
        }
        catch (err: any) 
        {
            if(err.code === 'SQLITE_CONSTRAINT')
            {
                return (reply.status(409).send({error: 'Username already taken'}));
            }
            return (reply.status(500).send({error: 'Internal server error'}));
        }

    });
}