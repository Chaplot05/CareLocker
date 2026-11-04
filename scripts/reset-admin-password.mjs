
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

loadEnvConfig(process.cwd());

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const rl = createInterface({ input: stdin, output: stdout });

try {
    const email = await rl.question("Registered admin email: ");
    const password = await rl.question("Enter your new password: ");

    if (!email.trim() || password.length < 8) {
        throw new Error("Enter a valid email and a password of at least 8 characters.");
    }

    const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
    });

    if (error) throw error;

    const user = data.users.find(
        u => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
        throw new Error("No Supabase Auth user found with this email.");
    }

    const { error: updateError } =
        await supabase.auth.admin.updateUserById(user.id, {
            password
        });

    if (updateError) throw updateError;

    console.log("\nSUCCESS! Your password has been updated.");
} catch (error) {
    console.error("\nERROR:", error.message);
} finally {
    rl.close();
}
