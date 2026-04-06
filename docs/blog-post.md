## Token Vault as a Governance Layer: What I Actually Learned Building with It

I went into this hackathon thinking Token Vault was basically a fancy secrets manager. Store OAuth tokens somewhere safe, swap them out when they expire, move on. Useful, sure, but nothing I couldn't replicate with a well-designed database table and some refresh logic.

I was pretty wrong about that.

### The Problem I Kept Running Into Before Token Vault

Here is how I used to handle OAuth tokens in agents: store the refresh token in a database column, encrypt it, write a cron job to keep access tokens fresh, and hope nothing leaks. That approach works fine until it doesn't. Your database becomes the target. One misconfigured row-level security policy, one leaked environment variable, and you have handed someone every refresh token for every user across every connected service. Not a theoretical risk, just a matter of when.

Token Vault changes the equation in a way that took me a while to fully internalize. Refresh tokens stay inside Auth0's infrastructure. When VaultGuard's scanner needs to hit the Slack Admin API, it calls RFC 8693 token exchange and gets back a short-lived access token. The refresh token is never in our code, never in our logs, never in our database. Our agent can act on behalf of users without us ever actually seeing the credentials that make it possible.

That is not just convenient. It is a fundamentally different security posture, and once I understood that, it changed how I thought about every other piece of the architecture.

### CIBA: Honestly, I Almost Skipped It

CIBA (Client Initiated Backchannel Authentication) was not in my original plan. My plan was: AI finds a problem, auto-fix it, send a Slack notification after. Simple.

Then I started thinking through what "auto-fix" actually means when you're removing people from GitHub orgs or revoking Slack admin rights. Those are irreversible. If the AI is wrong, or the scan flagged a false positive, there's real damage. I didn't want to build something that admins would be scared to turn on.

So I added CIBA, and it changed how the whole product feels.

The flow: VaultGuard's agent detects something critical, like a deactivated user still holding GitHub org-owner access. Instead of acting, it prepares the remediation and sends a CIBA request through Auth0. The admin gets an email: "VaultGuard wants to remove [username] from your GitHub organization. Approve or Reject."

The agent pauses. It polls Auth0 until the auth_req_id resolves. If the admin approves, the action runs. If they reject or just ignore it, nothing happens.

This turned out to be the feature that makes VaultGuard feel trustworthy rather than risky. A few reasons why it works so well:

1. Humans stay in control of anything irreversible
2. The approval is tied to the admin's actual identity, which creates a real audit record
3. The admin does not need to be in the app - the whole thing works asynchronously

### FGA: The Part I Underestimated

I added Auth0 FGA late, mostly because I thought role-based access control would be simple. It usually is, until you need something like: "team members can see all findings, but only org admins can approve remediations that affect the whole organization."

That specific rule is surprisingly messy to express cleanly in application code without it turning into scattered if/else blocks across multiple controllers. FGA let me write it once, as a policy:

```
// Only org admins can approve GitHub org-level remediations
type remediation
  relations
    define can_approve: admin from owner
```

Now enforcement is at the API layer, consistent across every endpoint, and easy to point to. When someone asks "how do you ensure only admins can do X," I can show them a policy file rather than try to explain five different controller conditions.

### The Full Flow, Once It Clicked

Once all the pieces were working together, the pattern that emerged is:

1. **Scan**: Token Vault provides time-limited access tokens. No stored credentials on our side.
2. **Analyze**: AI processes the raw findings and generates risk scores and specific recommendations.
3. **CIBA gate**: Anything state-changing goes through a CIBA request before execution.
4. **Execute**: Only after the admin approves does the action run, using a fresh Token Vault token.
5. **Audit**: Every step gets logged - what was found, who approved, what ran, when.

The thing I keep coming back to is the separation between consent at connection time (when the user installs VaultGuard and authorizes scopes) and approval at action time (when the agent actually wants to do something with that access). Token Vault and CIBA together make that separation concrete, not just a design principle on a whiteboard.

### Step-Up Auth: Added It at 2am, Glad I Did

Late in the build I noticed a gap. CIBA answers "should this action happen?" but it doesn't answer "is the person clicking Approve actually the legitimate admin right now?" Someone could walk up to an admin's unlocked laptop and approve a remediation.

So I added step-up authentication before any remediation flow. The admin has to re-authenticate with MFA via Auth0 before the approval lands. It's an extra click, but for an action like removing someone from a production GitHub org, that friction is appropriate.

Step-up and CIBA together cover different attack surfaces. I would not have thought to layer both of them before this build.

### A Few Things That Were Harder Than They Should Be

I want to be useful here, so here is what actually caused friction during the build:

**RFC 8693 error messages are cryptic.** When token exchange fails, you often just get `invalid_grant`. You don't know if the connection expired, the refresh token was revoked, or the scopes changed. I spent a few hours debugging something that a more descriptive error would have surfaced in minutes.

**CIBA polling feels awkward.** Right now I'm polling Auth0 for the approval status. A webhook-based callback would be cleaner. The agent could genuinely pause and resume instead of running on a fixed interval.

**Every agent needs a permissions transparency panel.** I built one myself showing exactly what scopes VaultGuard holds and what data it has accessed. Every serious agent is going to need something like this. It would be nice if Auth0 provided a scaffold rather than leaving each team to build their own from scratch.

**FGA and CIBA could be more connected.** Right now, FGA checks happen at the API layer and CIBA is a separate flow. An integrated approach where FGA policies could determine whether an action needs CIBA approval (vs. auto-executing for genuinely low-risk actions) would be really useful for more complex agents.

### What Actually Stuck With Me

Going into this I thought of Token Vault as infrastructure. A place to put things securely. By the end it felt more like a contract - a way for users to say "I authorize this agent to act for me, within these specific bounds, and I can revoke that anytime."

That reframe matters more than I expected. When someone connects their Slack workspace to VaultGuard, they're not handing us a password. They're granting a specific, audited, revocable delegation of authority to an AI agent. OAuth was always supposed to work like this. Token Vault makes it actually work like this for AI agents, which are a messier and higher-stakes context than the browser apps OAuth was originally designed for.

That's the thing I'll carry forward from this build.
