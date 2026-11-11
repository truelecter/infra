# Let's Encrypt account. HTTP-01 by default; https-certificate-issuer switches
# to DNS-01 through Cloudflare.
{
  security.acme = {
    acceptTerms = true;
    defaults.email = "andrew.panassiouk@gmail.com";
  };
}
