import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public Safaricom Daraja certificates (sandbox & production). These are PUBLIC.
const SANDBOX_CERT = `-----BEGIN CERTIFICATE-----
MIIGgDCCBWigAwIBAgIKMvrulAAAAARG5DANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0xNzA0MjUx
NjA3MjRaFw0xODAzMjExMzIwMTNaMIGNMQswCQYDVQQGEwJLRTEQMA4GA1UECBMH
TmFpcm9iaTEQMA4GA1UEBxMHTmFpcm9iaTEaMBgGA1UEChMRU2FmYXJpY29tIExp
bWl0ZWQxEzARBgNVBAsTClRlY2hub2xvZ3kxKTAnBgNVBAMTIGFwaWdlZS5hcGlj
YWxsZXIuc2FmYXJpY29tLmNvLmtlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAoknIb5Tm1hxOVdFsOejdCY1V+d7dVStuI3DMG/wKDLP4DEoENVU+SZFf
WlZZ7lsQVMrUDvX0aix2yk0sN/2BLPQ3M+jlPx1c+oogmKxglQE+UCcHvfqAvUyD
lLckRMUI8SQI42UMzHwfM2tcl6JmlpDmiQbf6zfWQNvruyFG7ESdvAv3nUSWVu/U
r4hVI6QvCx1oQDeENTjUSjVdr8q+jKE6JZAUFR8iWWBYTBcj1ytsGfRdW9rJ4yyT
CWeFIyM5VqDbgicMfTwQyDdvxIuwTuQApYrFnYxQlilM7QkX0sBNPiKsq2eaTbb2
RKvtcZN8/EM7Z6mFu1IMTKuoMzZWoQIDAQABo4IDDDCCAwgwHQYDVR0OBBYEFKxq
klSWBnIRSy86VkrA7TZv9JEEMB8GA1UdIwQYMBaAFOsy1E9+YJo6mCBjug1evuh5
TtUkMIIBOwYDVR0fBIIBMjCCAS4wggEqoIIBJqCCASKGgdZsZGFwOi8vL0NOPVNh
ZmFyaWNvbSUyMEludGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIsQ049U1ZEVDNJ
U1NDQTAxLENOPUNEUCxDTj1QdWJsaWMlMjBLZXklMjBTZXJ2aWNlcyxDTj1TZXJ2
aWNlcyxDTj1Db25maWd1cmF0aW9uLERDPXNhZmFyaWNvbSxEQz1uZXQ/Y2VydGlm
aWNhdGVSZXZvY2F0aW9uTGlzdD9iYXNlP29iamVjdENsYXNzPWNSTERpc3RyaWJ1
dGlvblBvaW50hkdodHRwOi8vY3JsLnNhZmFyaWNvbS5jby5rZS9TYWZhcmljb20l
MjBJbnRlcm5hbCUyMElzc3VpbmclMjBDQSUyMDAyLmNybDCCAQkGCCsGAQUFBwEB
BIH8MIH5MIHGBggrBgEFBQcwAoaBuWxkYXA6Ly8vQ049U2FmYXJpY29tJTIwSW50
ZXJuYWwlMjBJc3N1aW5nJTIwQ0ElMjAwMixDTj1BSUEsQ049UHVibGljJTIwS2V5
JTIwU2VydmljZXMsQ049U2VydmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1zYWZh
cmljb20sREM9bmV0P2NBQ2VydGlmaWNhdGU/YmFzZT9vYmplY3RDbGFzcz1jZXJ0
aWZpY2F0aW9uQXV0aG9yaXR5MC4GCCsGAQUFBzABhiJodHRwOi8vY3JsLnNhZmFy
aWNvbS5jby5rZS9vY3NwMAsGA1UdDwQEAwIFoDA9BgkrBgEEAYI3FQcEMDAuBiYr
BgEEAYI3FQiHz4xWhMLEA4XphTaE3tENhqCICGeGwcdsg7m5awIBZAIBDDAdBgNV
HSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwJwYJKwYBBAGCNxUKBBowGDAKBggr
BgEFBQcDAQAMCisGAQQBgjcVCgMwLAYDVR0RBCUwI4IgYXBpZ2VlLmFwaWNhbGxl
ci5zYWZhcmljb20uY28ua2UwDQYJKoZIhvcNAQELBQADggEBABwy3aHFGpf6jXc3
8u8nW01tj2N9JX3OOnRT5jvkkS6IxMTOXOd75/iAdAUlhrK6JpKkrxEKwhFXyqkE
ce8Lvi43U/cwINgF9hHbMRzwj17pIcdYpcaTcLY7BAfBe5pH+CTfaWY3WLI9MQrK
2yYn04WCl3vMW3LpyN8wEhsezDPaSfeyaCEHHy3JFLuPpzfQDcLgY3MzbOSdK/qS
ahyhVI0Iqr/9iqfTjt/jHwY4Q+9I0wTKShdsKy0RhKAsLEHbJrZIWdR0EFcw8sjN
gz/AhynfNRf/INXXqyZ2ZdHzfwGPVgnZGcGUCsd1OQNbR/n0+Yt/3IQF4JNNu5cv
0AYHGFM=
-----END CERTIFICATE-----`;

const PRODUCTION_CERT = `-----BEGIN CERTIFICATE-----
MIIGkzCCBXugAwIBAgIKXfBp5gAAAAQuczANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0yMTA1MTIw
NzA5NDRaFw0yMjA1MTIwNzA5NDRaMHsxCzAJBgNVBAYTAktFMRAwDgYDVQQIEwdO
YWlyb2JpMRAwDgYDVQQHEwdOYWlyb2JpMRowGAYDVQQKExFTYWZhcmljb20gTGlt
aXRlZDETMBEGA1UECxMKVGVjaG5vbG9neTEXMBUGA1UEAxMOYXBpLnNhZmFyaWNv
bTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKlu0+UYVtotwxWVUwJV
1zol+JJgEKsiPyBA7gG1F0/4Vc4c1+T4ULpsCYzJEgRWzj+OWGEEr5tQuvigOSwl
pNxF0gv7c6IUDcBe/3eO7Ic6dZuPdF/TVA15ELXg5UY3UDXTwBdEEgbXVwFAGGSv
12N4VnldOmcvpf+lqLZj7QPjsW7WTb7Q0KrAxntH4loxcjOTI+M5L5xqdxLpag5N
Jl+oRWPmczc4Jr8O3KQ4kE8AmFR7qzwQbCpaWWY5JcuQ7vDi+gKkdz4U6XKAg+wq
r9KKuoNh6IjN/PVrPYFqcGOhuCDB+JpHIRP/CSWVnH9G6+Tt2pPe9Q1bcOiW1Y0L
ZycCAwEAAaOCAxQwggMQMB0GA1UdDgQWBBQ0+/SHbDIxRkN2eF6puzWQI/UICTAf
BgNVHSMEGDAWgBTrMtRPfmCaOpggY7oNXr7oeU7VJDCCATsGA1UdHwSCATIwggEu
MIIBKqCCASagggEihoHWbGRhcDovLy9DTj1TYWZhcmljb20lMjBJbnRlcm5hbCUy
MElzc3VpbmclMjBDQSUyMDAyLENOPVNWRFQzSVNTQ0EwMSxDTj1DRFAsQ049UHVi
bGljJTIwS2V5JTIwU2VydmljZXMsQ049U2VydmljZXMsQ049Q29uZmlndXJhdGlv
bixEQz1zYWZhcmljb20sREM9bmV0P2NlcnRpZmljYXRlUmV2b2NhdGlvbkxpc3Q/
YmFzZT9vYmplY3RDbGFzcz1jUkxEaXN0cmlidXRpb25Qb2ludIZHaHR0cDovL2Ny
bC5zYWZhcmljb20uY28ua2UvU2FmYXJpY29tJTIwSW50ZXJuYWwlMjBJc3N1aW5n
JTIwQ0ElMjAwMi5jcmwwggEHBggrBgEFBQcBAQSB+jCB9zCBxAYIKwYBBQUHMAKG
gbdsZGFwOi8vL0NOPVNhZmFyaWNvbSUyMEludGVybmFsJTIwSXNzdWluZyUyMENB
JTIwMDIsQ049QUlBLENOPVB1YmxpYyUyMEtleSUyMFNlcnZpY2VzLENOPVNlcnZp
Y2VzLENOPUNvbmZpZ3VyYXRpb24sREM9c2FmYXJpY29tLERDPW5ldD9jQUNlcnRp
ZmljYXRlP2Jhc2U/b2JqZWN0Q2xhc3M9Y2VydGlmaWNhdGlvbkF1dGhvcml0eTAu
BggrBgEFBQcwAYYiaHR0cDovL2NybC5zYWZhcmljb20uY28ua2Uvb2NzcDALBgNV
HQ8EBAMCBaAwPQYJKwYBBAGCNxUHBDAwLgYmKwYBBAGCNxUIh8+MVoTCxAOF6YU2
hN7RDYagiAhnhsHHbIO5uWsCAWQCAQwwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsG
AQUFBwMCMCcGCSsGAQQBgjcVCgQaMBgwCgYIKwYBBQUHAwEwCgYIKwYBBQUHAwIw
GQYDVR0RBBIwEIIOYXBpLnNhZmFyaWNvbTANBgkqhkiG9w0BAQsFAAOCAQEAU9Z5
Z9q7g8Tp6sk6V0gJqLgbB7Ng/Q0gK35Yc8KkP6Y0BjlsiWuC8muTk97pXmnYzZTb
t1szs1ZIVcRsf4uIqlxL7TCMmqjVPNZNXLqWiYL5gjkX5Xz3oQpJW68YqV0Lqq2X
wM2pZyL1pZkUv1nGZ8z5ZJ7w8h+y4o4mWmPgkNJrR3w3qpKgNkUk7M6XKgw/V1tc
QVxqgkdGqkvSeyhKbcCmoEhP8sXxc0KOcCJZlNlpRRWdj5RvNiYxBQ/eMqkqJsxC
v6lU8oeWdj4cgyq1q6lO9rxFnAyCwJ3VAlPYK7l7ZQRppk1G0+Wb6sf2Ay9wU5xT
RhV5xZpfQRdy7lDPdQ==
-----END CERTIFICATE-----`;

function encryptWithCert(plaintext: string, certPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const encrypted = publicKey.encrypt(plaintext, "RSAES-PKCS1-V1_5");
  return forge.util.encode64(encrypted);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("auth error", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdminData, error: adminErr } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (adminErr) console.error("is_admin error", adminErr);
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { password, environment } = await req.json();
    if (!password || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "password required" }), { status: 400, headers: corsHeaders });
    }
    const cert = environment === "production" ? PRODUCTION_CERT : SANDBOX_CERT;
    let securityCredential: string;
    try {
      securityCredential = encryptWithCert(password, cert);
    } catch (encErr) {
      console.error("encryption error", encErr);
      return new Response(JSON.stringify({ error: "Encryption failed: " + (encErr as Error).message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ securityCredential }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("encrypt error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});