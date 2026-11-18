# The root MikroTik router (catalog.devices.x290-router), through its REST API
# over HTTPS. x290-router.pem is the router's self-signed `rest-api`
# certificate, pinned instead of trusting a CA.
{catalog, ...}: let
  address = catalog.devices.x290-router.net.x290.ip;
in {
  terraform.required_providers.routeros.source = "terraform-routeros/routeros";

  # The password comes from ROS_PASSWORD, set from secrets/terraform.yaml.
  provider.routeros = {
    hosturl = "https://${address}";
    username = "admin";
    ca_certificate = "${./x290-router.pem}";
  };

  # Services always exist: creating one only sets it (`numbers` names it).
  resource.routeros_ip_service = {
    www_ssl = {
      numbers = "www-ssl";
      port = 443;
      certificate = "rest-api";
      tls_version = "only-1.2";
      disabled = false;
    };
    telnet = {
      numbers = "telnet";
      port = 23;
      disabled = true;
    };
    ftp = {
      numbers = "ftp";
      port = 21;
      disabled = true;
    };
  };
}
