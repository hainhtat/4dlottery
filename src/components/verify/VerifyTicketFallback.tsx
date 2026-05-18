import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";

export function VerifyTicketFallback() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201, 162, 39, 0.18), transparent),
          linear-gradient(155deg, #0f172a 0%, #1e293b 42%, #0f172a 100%)
        `,
        color: "#94a3b8",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid rgba(201, 162, 39, 0.25)",
          borderTopColor: "#c9a227",
          animation: "verifySpin 0.9s linear infinite",
          "@keyframes verifySpin": {
            to: { transform: "rotate(360deg)" },
          },
        }}
      />
      <Typography level="body-sm" sx={{ letterSpacing: "0.04em" }}>
        Loading verification…
      </Typography>
    </Box>
  );
}
